import type { ScreenshotRecord } from "@screenshot-sync/contracts";
import type { ScreenshotRow } from "@screenshot-sync/db-schema";

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toScreenshotRecord(row: ScreenshotRow): ScreenshotRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    deviceId: row.deviceId,
    clientGeneratedId: row.clientGeneratedId ?? null,
    status: row.status as ScreenshotRecord["status"],
    capturedAt: row.capturedAt.toISOString(),
    detectedAt: row.detectedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    failedReason: row.failedReason ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    mimeType: row.mimeType ?? null,
    fileSizeBytes: row.fileSizeBytes ?? null,
    previewStorageKey: row.previewStorageKey ?? null,
    previewMimeType: row.previewMimeType ?? null,
    previewSizeBytes: row.previewSizeBytes ?? null,
    previewWidth: row.previewWidth ?? null,
    previewHeight: row.previewHeight ?? null,
    blurhash: row.blurhash ?? null,
    previewUploadedAt: toIsoString(row.previewUploadedAt ?? null),
    originalStorageKey: row.originalStorageKey ?? null,
    originalMimeType: row.originalMimeType ?? null,
    originalSizeBytes: row.originalSizeBytes ?? null,
    originalUploadedAt: toIsoString(row.originalUploadedAt ?? null),
    deletedAt: toIsoString(row.deletedAt ?? null),
  };
}
