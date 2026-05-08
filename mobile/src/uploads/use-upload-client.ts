import { useEffect, useRef } from 'react';
import {
  ensureScreenshotPermission,
  isScreenshotDetectorAvailable,
  startReliabilityMode,
  startScreenshotDetection,
  subscribeToScreenshotDetections,
} from '../detection/screenshotDetector';
import { loadPairedDeviceSession, type PairedDeviceSession } from '../pairing/sessionStore';
import {
  enqueueScreenshotCandidate,
  getQueueSummary,
  listUploadableQueueItems,
  markQueueItemFailed,
  markQueueItemUploaded,
  markQueueItemUploading,
  resetUploadingQueueItems,
  type ScreenshotQueueItem,
} from '../storage/queue';
import {
  cleanupStagedFile,
  completeOriginalUpload,
  completePreviewUpload,
  extractStorageKey,
  failRemoteScreenshot,
  getQueueItemFileSize,
  getQueueItemMimeType,
  initRemoteScreenshot,
  stageQueueItemFile,
  uploadFileUri,
} from './api';
import { notifyUploadBatchFinished, notifyUploadBatchStarted } from './notifications';

const POLL_INTERVAL_MS = 12_000;
const DEBUG_UPLOADS = false;

function logUpload(scope: string, details: Record<string, unknown>) {
  if (!DEBUG_UPLOADS) {
    return;
  }

  console.log(`[upload:${scope}]`, details);
}

function logUploadError(scope: string, details: Record<string, unknown>) {
  console.error(`[upload:${scope}]`, details);
}

export function useUploadClient(session: PairedDeviceSession | null) {
  const isRunningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session) {
      logUpload('skip-no-session', {});
      return;
    }

    let isDisposed = false;
    let detectorSubscription: { remove(): void } | null = null;

    const triggerDrain = () => {
      void drainQueue();
    };

    const bootstrap = async () => {
      logUpload('bootstrap-start', {
        deviceId: session.deviceId,
        workspaceId: session.workspaceId,
        serverUrl: session.serverUrl,
      });
      await resetUploadingQueueItems();
      if (isDisposed) {
        logUpload('bootstrap-disposed', {});
        return;
      }

      const detectorAvailable = isScreenshotDetectorAvailable();
      logUpload('detector-availability', {
        detectorAvailable,
      });

      if (detectorAvailable) {
        const hasPermission = await ensureScreenshotPermission();
        logUpload('detector-permission', {
          hasPermission,
        });
        if (hasPermission) {
          try {
            await startScreenshotDetection();
            logUpload('detector-watch-started', {});
          } catch {
            logUploadError('detector-watch-start-failed', {});
          }

          try {
            await startReliabilityMode();
            logUpload('reliability-started', {});
          } catch {
            logUploadError('reliability-start-failed', {});
          }

          detectorSubscription = subscribeToScreenshotDetections((candidate) => {
            logUpload('detector-candidate', {
              id: candidate.id,
              uri: candidate.uri,
              mediaStoreId: candidate.mediaStoreId,
            });
            void enqueueScreenshotCandidate(candidate)
              .then(async () => {
                const summary = await getQueueSummary();
                logUpload('detector-enqueued', summary);
                triggerDrain();
              })
              .catch((error) => {
                logUploadError('detector-enqueue-failed', {
                  message: error instanceof Error ? error.message : String(error),
                });
              });
          });
        }
      }

      intervalRef.current = setInterval(() => {
        logUpload('poll-tick', {});
        triggerDrain();
      }, POLL_INTERVAL_MS);
      logUpload('poll-started', {
        intervalMs: POLL_INTERVAL_MS,
      });
      triggerDrain();
    };

    const drainQueue = async () => {
      if (isRunningRef.current) {
        logUpload('drain-skip-running', {});
        return;
      }

      const currentSession = await loadPairedDeviceSession();
      if (!currentSession || currentSession.deviceId !== session.deviceId || isDisposed) {
        logUpload('drain-skip-session-mismatch', {
          hasSession: Boolean(currentSession),
          expectedDeviceId: session.deviceId,
          currentDeviceId: currentSession?.deviceId ?? null,
          isDisposed,
        });
        return;
      }

      isRunningRef.current = true;

      let successCount = 0;
      let failureCount = 0;

      try {
        const summaryBefore = await getQueueSummary();
        logUpload('queue-summary-before', summaryBefore);
        const items = await listUploadableQueueItems(8);
        if (items.length === 0) {
          logUpload('drain-empty', {});
          return;
        }

        logUpload('drain-start', {
          deviceId: currentSession.deviceId,
          itemCount: items.length,
        });

        await notifyUploadBatchStarted(items.length);

        for (const item of items) {
          try {
            await processQueueItem(currentSession, item);
            successCount += 1;
          } catch (error) {
            failureCount += 1;
            const message = error instanceof Error ? error.message : 'UPLOAD_FAILED';
            logUploadError('item-failed', {
              id: item.id,
              uri: item.uri,
              message,
            });
            await markQueueItemFailed(item.id, message);
          }
        }
      } finally {
        if (successCount > 0 || failureCount > 0) {
          logUpload('drain-finished', {
            successCount,
            failureCount,
          });
          await notifyUploadBatchFinished(successCount, failureCount);
        }
        const summaryAfter = await getQueueSummary();
        logUpload('queue-summary-after', summaryAfter);
        isRunningRef.current = false;
      }
    };

    void bootstrap();

    return () => {
      isDisposed = true;
      detectorSubscription?.remove();
      logUpload('cleanup', {});
      isRunningRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session]);
}

async function processQueueItem(session: PairedDeviceSession, item: ScreenshotQueueItem) {
  await markQueueItemUploading(item.id);
  logUpload('item-start', {
    id: item.id,
    uri: item.uri,
    detectedAt: item.detectedAt,
  });

  const mimeType = getQueueItemMimeType(item);
  const fileSizeBytes = await getQueueItemFileSize(item);
  const stagedUri = await stageQueueItemFile(item, mimeType);
  logUpload('item-file-ready', {
    id: item.id,
    stagedUri,
    mimeType,
    fileSizeBytes,
    capturedAt: item.capturedAt,
    width: item.width,
    height: item.height,
  });
  const initResponse = await initRemoteScreenshot(session, item, fileSizeBytes);
  logUpload('item-init-complete', {
    id: item.id,
    screenshotId: initResponse.screenshotId,
    previewUrl: initResponse.uploadTargets.preview.url,
    originalUrl: initResponse.uploadTargets.original.url,
  });
  const previewStorageKey = extractStorageKey(initResponse.uploadTargets.preview.url);
  const originalStorageKey = extractStorageKey(initResponse.uploadTargets.original.url);

  try {
    await uploadFileUri(initResponse.uploadTargets.preview.url, stagedUri, mimeType);
    logUpload('item-preview-uploaded', {
      id: item.id,
      screenshotId: initResponse.screenshotId,
    });
    await completePreviewUpload(session, initResponse.screenshotId, {
      storageKey: previewStorageKey,
      mimeType,
      sizeBytes: fileSizeBytes,
      width: item.width ?? 0,
      height: item.height ?? 0,
      blurhash: null,
    });
    logUpload('item-preview-complete', {
      id: item.id,
      screenshotId: initResponse.screenshotId,
    });

    await uploadFileUri(initResponse.uploadTargets.original.url, stagedUri, mimeType);
    logUpload('item-original-uploaded', {
      id: item.id,
      screenshotId: initResponse.screenshotId,
    });
    await completeOriginalUpload(session, initResponse.screenshotId, {
      storageKey: originalStorageKey,
      mimeType,
      sizeBytes: fileSizeBytes,
    });
    logUpload('item-original-complete', {
      id: item.id,
      screenshotId: initResponse.screenshotId,
    });

    await markQueueItemUploaded(item.id);
    await cleanupStagedFile(stagedUri);
    logUpload('item-finished', {
      id: item.id,
      screenshotId: initResponse.screenshotId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UPLOAD_FAILED';
    logUploadError('item-process-error', {
      id: item.id,
      screenshotId: initResponse.screenshotId,
      message,
    });
    await cleanupStagedFile(stagedUri).catch(() => undefined);
    await failRemoteScreenshot(session, initResponse.screenshotId, message).catch(() => undefined);
    throw error;
  }
}
