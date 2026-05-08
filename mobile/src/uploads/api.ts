import * as LegacyFileSystem from 'expo-file-system/legacy';
import { cacheDirectory, copyAsync, deleteAsync, getInfoAsync } from 'expo-file-system/legacy';
import type {
  ScreenshotFailRequest,
  ScreenshotInitRequest,
  ScreenshotInitResponse,
  ScreenshotOriginalCompleteRequest,
  ScreenshotPreviewCompleteRequest,
} from '@screenshot-sync/contracts';
import type { PairedDeviceSession } from '../pairing/sessionStore';
import type { ScreenshotQueueItem } from '../storage/queue';

function getAuthHeaders(session: PairedDeviceSession) {
  return {
    authorization: `Bearer ${session.deviceToken}`,
    'content-type': 'application/json',
  };
}

function normalizeBaseUrl(serverUrl: string) {
  return serverUrl.replace(/\/$/, '');
}

function getSafeFileExtension(fileName: string, mimeType: string) {
  const explicitExtension = fileName.split('.').pop()?.trim().toLowerCase();
  if (explicitExtension && explicitExtension !== fileName.toLowerCase()) {
    return explicitExtension;
  }

  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}

export function getQueueItemMimeType(item: ScreenshotQueueItem) {
  return item.mimeType ?? guessMimeTypeFromName(item.fileName);
}

function guessMimeTypeFromName(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/png';
}

export function extractStorageKey(uploadUrl: string) {
  const url = new URL(uploadUrl);
  return url.pathname.replace(/^\/internal\/uploads\//, '');
}

export async function getQueueItemFileSize(item: ScreenshotQueueItem): Promise<number> {
  const info = await getInfoAsync(item.uri);
  if (!info.exists || typeof info.size !== 'number') {
    throw new Error('QUEUE_ITEM_NOT_READABLE');
  }

  return info.size;
}

export async function stageQueueItemFile(item: ScreenshotQueueItem, mimeType: string): Promise<string> {
  if (!cacheDirectory) {
    throw new Error('CACHE_DIRECTORY_UNAVAILABLE');
  }

  const extension = getSafeFileExtension(item.fileName, mimeType);
  const stagedUri = `${cacheDirectory}upload-${item.id}.${extension}`;

  await copyAsync({
    from: item.uri,
    to: stagedUri,
  });

  return stagedUri;
}

export async function cleanupStagedFile(stagedUri: string | null) {
  if (!stagedUri) {
    return;
  }

  await deleteAsync(stagedUri, { idempotent: true });
}

export async function initRemoteScreenshot(
  session: PairedDeviceSession,
  item: ScreenshotQueueItem,
  fileSizeBytes: number,
): Promise<ScreenshotInitResponse> {
  const request: ScreenshotInitRequest = {
    clientGeneratedId: item.id,
    capturedAt: item.capturedAt ?? item.detectedAt,
    detectedAt: item.detectedAt,
    width: item.width ?? 0,
    height: item.height ?? 0,
    mimeType: getQueueItemMimeType(item),
    fileSizeBytes,
  };

  const response = await fetch(`${normalizeBaseUrl(session.serverUrl)}/api/screenshots/init`, {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`INIT_FAILED_${response.status}`);
  }

  return (await response.json()) as ScreenshotInitResponse;
}

export async function uploadBinary(url: string, mimeType: string, bytes: Uint8Array<ArrayBuffer>) {
  void bytes;
  throw new Error('UPLOAD_BINARY_REQUIRES_URI');
}

export async function uploadFileUri(url: string, fileUri: string, mimeType: string) {
  const response = await LegacyFileSystem.uploadAsync(url, fileUri, {
    httpMethod: 'PUT',
    headers: {
      'content-type': mimeType,
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`UPLOAD_FAILED_${response.status}`);
  }
}

export async function completePreviewUpload(
  session: PairedDeviceSession,
  screenshotId: string,
  request: ScreenshotPreviewCompleteRequest,
) {
  const response = await fetch(`${normalizeBaseUrl(session.serverUrl)}/api/screenshots/${screenshotId}/preview`, {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`PREVIEW_COMPLETE_FAILED_${response.status}`);
  }
}

export async function completeOriginalUpload(
  session: PairedDeviceSession,
  screenshotId: string,
  request: ScreenshotOriginalCompleteRequest,
) {
  const response = await fetch(`${normalizeBaseUrl(session.serverUrl)}/api/screenshots/${screenshotId}/original`, {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`ORIGINAL_COMPLETE_FAILED_${response.status}`);
  }
}

export async function failRemoteScreenshot(
  session: PairedDeviceSession,
  screenshotId: string,
  reason: string,
) {
  const request: ScreenshotFailRequest = { reason };
  const response = await fetch(`${normalizeBaseUrl(session.serverUrl)}/api/screenshots/${screenshotId}/fail`, {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`FAIL_COMPLETE_FAILED_${response.status}`);
  }
}
