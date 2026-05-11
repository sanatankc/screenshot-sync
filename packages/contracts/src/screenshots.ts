import type { ScreenshotRow } from "@screenshot-sync/db-schema";

export type ScreenshotStatus =
  | "pending"
  | "preview_ready"
  | "ready"
  | "failed"
  | "deleted";

type SerializeDates<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K] extends Date | undefined
        ? string | undefined
        : T[K];
};

export type ScreenshotRecord = Omit<SerializeDates<ScreenshotRow>, "status"> & {
  status: ScreenshotStatus;
};

export type ScreenshotListResponse = {
  items: ScreenshotRecord[];
  nextCursor: string | null;
};

export type ScreenshotInitRequest = {
  clientGeneratedId: string;
  capturedAt: string;
  detectedAt: string;
  width: number;
  height: number;
  mimeType: string;
  fileSizeBytes: number;
};

export type UploadTarget = {
  method: "PUT";
  url: string;
  headers?: Record<string, string>;
};

export type ScreenshotInitResponse = {
  screenshotId: string;
  status: ScreenshotStatus;
  uploadTargets: {
    preview: UploadTarget;
    original: UploadTarget;
  };
};

export type ScreenshotPreviewCompleteRequest = {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  blurhash: string | null;
};

export type ScreenshotOriginalCompleteRequest = {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

export type ScreenshotFailRequest = {
  reason: string;
};

export type ScreenshotDeleteResponse = {
  screenshotId: string;
};
