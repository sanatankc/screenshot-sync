import { and, desc, eq } from "drizzle-orm";
import type {
  ScreenshotFailRequest,
  ScreenshotInitRequest,
  ScreenshotInitResponse,
  ScreenshotListResponse,
  ScreenshotOriginalCompleteRequest,
  ScreenshotPreviewCompleteRequest,
  ScreenshotRecord,
} from "@screenshot-sync/contracts";
import { screenshots, workspaces } from "@screenshot-sync/db-schema";
import type { Env } from "@server/lib/env";
import { createId } from "@server/lib/crypto";
import { getDb } from "@server/lib/db";
import { toScreenshotRecord } from "@server/lib/mappers";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

function buildUploadTarget(serverUrl: string, storageKey: string) {
  return {
    method: "PUT" as const,
    url: `${serverUrl}/internal/uploads/${storageKey}`,
  };
}

function touchWorkspace(env: Env, workspaceId: string, now: Date) {
  const db = getDb(env);
  return db
    .update(workspaces)
    .set({ updatedAt: now, lastActivityAt: now })
    .where(eq(workspaces.id, workspaceId));
}

export async function listScreenshots(
  env: Env,
  workspaceId: string,
  limitParam: string | null,
): Promise<ScreenshotListResponse> {
  const db = getDb(env);
  const limit = Math.min(Math.max(Number(limitParam ?? DEFAULT_LIST_LIMIT) || DEFAULT_LIST_LIMIT, 1), MAX_LIST_LIMIT);

  const rows = await db.query.screenshots.findMany({
    where: eq(screenshots.workspaceId, workspaceId),
    orderBy: [desc(screenshots.createdAt)],
    limit,
  });

  return {
    items: rows.map(toScreenshotRecord),
    nextCursor: null,
  };
}

export async function initScreenshot(
  env: Env,
  input: {
    workspaceId: string;
    deviceId: string;
    request: ScreenshotInitRequest;
    serverUrl: string;
  },
): Promise<ScreenshotInitResponse & { screenshot: ScreenshotRecord }> {
  const db = getDb(env);
  const now = new Date();

  const existing = await db.query.screenshots.findFirst({
    where: and(
      eq(screenshots.deviceId, input.deviceId),
      eq(screenshots.clientGeneratedId, input.request.clientGeneratedId),
    ),
  });

  const screenshotId = existing?.id ?? createId("shot");
  const originalStorageKey = `${input.workspaceId}/${screenshotId}/original`;
  const previewStorageKey = `${input.workspaceId}/${screenshotId}/preview`;

  if (!existing) {
    await db.insert(screenshots).values({
      id: screenshotId,
      workspaceId: input.workspaceId,
      deviceId: input.deviceId,
      clientGeneratedId: input.request.clientGeneratedId,
      status: "pending",
      capturedAt: new Date(input.request.capturedAt),
      detectedAt: new Date(input.request.detectedAt),
      createdAt: now,
      updatedAt: now,
      failedReason: null,
      width: input.request.width,
      height: input.request.height,
      mimeType: input.request.mimeType,
      fileSizeBytes: input.request.fileSizeBytes,
      previewStorageKey: null,
      previewMimeType: null,
      previewSizeBytes: null,
      previewWidth: null,
      previewHeight: null,
      blurhash: null,
      previewUploadedAt: null,
      originalStorageKey: null,
      originalMimeType: null,
      originalSizeBytes: null,
      originalUploadedAt: null,
      deletedAt: null,
    });
  }

  const screenshot = await db.query.screenshots.findFirst({
    where: eq(screenshots.id, screenshotId),
  });

  if (!screenshot) {
    throw new Error("SCREENSHOT_NOT_FOUND");
  }

  await touchWorkspace(env, input.workspaceId, now);

  return {
    screenshotId,
    status: existing?.status ?? "pending",
    screenshot: toScreenshotRecord(screenshot),
    uploadTargets: {
      preview: buildUploadTarget(input.serverUrl, previewStorageKey),
      original: buildUploadTarget(input.serverUrl, originalStorageKey),
    },
  };
}

export async function completePreviewUpload(
  env: Env,
  input: {
    workspaceId: string;
    deviceId: string;
    screenshotId: string;
    request: ScreenshotPreviewCompleteRequest;
  },
): Promise<ScreenshotRecord> {
  const db = getDb(env);
  const now = new Date();

  const existing = await db.query.screenshots.findFirst({
    where: and(
      eq(screenshots.id, input.screenshotId),
      eq(screenshots.workspaceId, input.workspaceId),
      eq(screenshots.deviceId, input.deviceId),
    ),
  });

  if (!existing) {
    throw new Error("SCREENSHOT_NOT_FOUND");
  }

  await db
    .update(screenshots)
    .set({
      status: existing.originalUploadedAt ? "ready" : "preview_ready",
      updatedAt: now,
      failedReason: null,
      previewStorageKey: input.request.storageKey,
      previewMimeType: input.request.mimeType,
      previewSizeBytes: input.request.sizeBytes,
      previewWidth: input.request.width,
      previewHeight: input.request.height,
      blurhash: input.request.blurhash,
      previewUploadedAt: now,
    })
    .where(eq(screenshots.id, input.screenshotId));

  const updated = await db.query.screenshots.findFirst({
    where: eq(screenshots.id, input.screenshotId),
  });

  if (!updated) {
    throw new Error("SCREENSHOT_NOT_FOUND");
  }

  await touchWorkspace(env, input.workspaceId, now);
  return toScreenshotRecord(updated);
}

export async function completeOriginalUpload(
  env: Env,
  input: {
    workspaceId: string;
    deviceId: string;
    screenshotId: string;
    request: ScreenshotOriginalCompleteRequest;
  },
): Promise<ScreenshotRecord> {
  const db = getDb(env);
  const now = new Date();

  const existing = await db.query.screenshots.findFirst({
    where: and(
      eq(screenshots.id, input.screenshotId),
      eq(screenshots.workspaceId, input.workspaceId),
      eq(screenshots.deviceId, input.deviceId),
    ),
  });

  if (!existing) {
    throw new Error("SCREENSHOT_NOT_FOUND");
  }

  await db
    .update(screenshots)
    .set({
      status: "ready",
      updatedAt: now,
      failedReason: null,
      originalStorageKey: input.request.storageKey,
      originalMimeType: input.request.mimeType,
      originalSizeBytes: input.request.sizeBytes,
      originalUploadedAt: now,
    })
    .where(eq(screenshots.id, input.screenshotId));

  const updated = await db.query.screenshots.findFirst({
    where: eq(screenshots.id, input.screenshotId),
  });

  if (!updated) {
    throw new Error("SCREENSHOT_NOT_FOUND");
  }

  await touchWorkspace(env, input.workspaceId, now);
  return toScreenshotRecord(updated);
}

export async function failScreenshot(
  env: Env,
  input: {
    workspaceId: string;
    deviceId: string;
    screenshotId: string;
    request: ScreenshotFailRequest;
  },
): Promise<ScreenshotRecord> {
  const db = getDb(env);
  const now = new Date();

  const existing = await db.query.screenshots.findFirst({
    where: and(
      eq(screenshots.id, input.screenshotId),
      eq(screenshots.workspaceId, input.workspaceId),
      eq(screenshots.deviceId, input.deviceId),
    ),
  });

  if (!existing) {
    throw new Error("SCREENSHOT_NOT_FOUND");
  }

  await db
    .update(screenshots)
    .set({
      status: "failed",
      updatedAt: now,
      failedReason: input.request.reason,
    })
    .where(eq(screenshots.id, input.screenshotId));

  const updated = await db.query.screenshots.findFirst({
    where: eq(screenshots.id, input.screenshotId),
  });

  if (!updated) {
    throw new Error("SCREENSHOT_NOT_FOUND");
  }

  await touchWorkspace(env, input.workspaceId, now);
  return toScreenshotRecord(updated);
}
