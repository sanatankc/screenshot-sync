import type { ScreenshotCandidate } from "../detection/screenshotDetector";
import { database } from "./bootstrap";

export type QueueStatus = "queued" | "uploading" | "uploaded" | "failed";

export type ScreenshotQueueItem = {
  id: string;
  mediaStoreId: string | null;
  uri: string;
  fileName: string;
  relativePath: string | null;
  detectedAt: string;
  status: QueueStatus;
  retryCount: number;
  lastError: string | null;
  uploadedAt: string | null;
};

export type QueueSummary = {
  total: number;
  queued: number;
  uploading: number;
  uploaded: number;
  failed: number;
};

export async function enqueueScreenshotCandidate(candidate: ScreenshotCandidate) {
  database.runSync(
    `
      INSERT INTO screenshot_queue (
        id,
        media_store_id,
        uri,
        file_name,
        relative_path,
        detected_at,
        status,
        retry_count,
        last_error,
        uploaded_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'queued', 0, NULL, NULL)
      ON CONFLICT(id) DO NOTHING;
    `,
    [
      candidate.id,
      candidate.mediaStoreId,
      candidate.uri,
      candidate.fileName,
      candidate.relativePath,
      new Date(candidate.detectedAt).toISOString(),
    ]
  );
}

export async function listQueueItems(limit = 20): Promise<ScreenshotQueueItem[]> {
  const rows = database.getAllSync<{
    id: string;
    media_store_id: string | null;
    uri: string;
    file_name: string;
    relative_path: string | null;
    detected_at: string;
    status: QueueStatus;
    retry_count: number;
    last_error: string | null;
    uploaded_at: string | null;
  }>(
    `
      SELECT
        id,
        media_store_id,
        uri,
        file_name,
        relative_path,
        detected_at,
        status,
        retry_count,
        last_error,
        uploaded_at
      FROM screenshot_queue
      ORDER BY datetime(detected_at) DESC
      LIMIT ?;
    `,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    mediaStoreId: row.media_store_id,
    uri: row.uri,
    fileName: row.file_name,
    relativePath: row.relative_path,
    detectedAt: row.detected_at,
    status: row.status,
    retryCount: row.retry_count,
    lastError: row.last_error,
    uploadedAt: row.uploaded_at,
  }));
}

export async function getQueueSummary(): Promise<QueueSummary> {
  const row = database.getFirstSync<{
    total: number;
    queued: number;
    uploading: number;
    uploaded: number;
    failed: number;
  }>(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
        SUM(CASE WHEN status = 'uploading' THEN 1 ELSE 0 END) AS uploading,
        SUM(CASE WHEN status = 'uploaded' THEN 1 ELSE 0 END) AS uploaded,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM screenshot_queue;
    `
  );

  return {
    total: row?.total ?? 0,
    queued: row?.queued ?? 0,
    uploading: row?.uploading ?? 0,
    uploaded: row?.uploaded ?? 0,
    failed: row?.failed ?? 0,
  };
}
