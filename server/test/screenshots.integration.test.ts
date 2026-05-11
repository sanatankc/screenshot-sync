import { env, SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { screenshots } from "@screenshot-sync/db-schema";
import type {
  PairingCompleteResponse,
  PairingSessionCreateResponse,
  ScreenshotInitResponse,
  ScreenshotListResponse,
  ScreenshotRecord,
} from "@screenshot-sync/contracts";
import { describe, expect, it } from "vitest";

const db = drizzle(env.DB, { schema: { screenshots } });

function extractStorageKey(uploadUrl: string): string {
  const url = new URL(uploadUrl);
  return url.pathname.replace(/^\/internal\/uploads\//, "");
}

async function createPairedContext() {
  const pairingSessionResponse = await SELF.fetch("http://example.com/api/pairing/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientName: "Sanatan Chrome" }),
  });
  const pairingSession = await pairingSessionResponse.json<PairingSessionCreateResponse>();

  const pairingCompleteResponse = await SELF.fetch("http://example.com/api/pairing/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      pairingSessionId: pairingSession.pairingSessionId,
      pairingToken: pairingSession.pairingToken,
      device: {
        deviceIdentity: "device_identity_pixel_8",
        platform: "android",
        deviceName: "Pixel 8",
        appVersion: "1.0.0",
      },
    }),
  });
  const pairingComplete = await pairingCompleteResponse.json<PairingCompleteResponse>();

  return {
    workspaceId: pairingComplete.workspaceId,
    webSessionToken: pairingSession.webSessionToken,
    deviceToken: pairingComplete.deviceToken,
    deviceId: pairingComplete.deviceId,
  };
}

describe("screenshot routes", () => {
  it("creates a screenshot record and returns upload targets", async () => {
    const context = await createPairedContext();

    const response = await SELF.fetch("http://example.com/api/screenshots/init", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify({
        clientGeneratedId: "candidate-1",
        capturedAt: "2026-05-04T00:00:00.000Z",
        detectedAt: "2026-05-04T00:00:01.000Z",
        width: 1080,
        height: 2400,
        mimeType: "image/png",
        fileSizeBytes: 2048,
      }),
    });

    expect(response.status).toBe(201);

    const data = await response.json<ScreenshotInitResponse>();
    expect(data.screenshotId).toMatch(/^shot_/);
    expect(data.status).toBe("pending");
    expect(data.uploadTargets.preview.url).toContain(`/internal/uploads/${context.workspaceId}/${data.screenshotId}/preview`);
    expect(data.uploadTargets.original.url).toContain(`/internal/uploads/${context.workspaceId}/${data.screenshotId}/original`);

    const stored = await db.query.screenshots.findFirst({
      where: eq(screenshots.id, data.screenshotId),
    });

    expect(stored?.workspaceId).toBe(context.workspaceId);
    expect(stored?.deviceId).toBe(context.deviceId);
    expect(stored?.clientGeneratedId).toBe("candidate-1");
  });

  it("dedupes init for the same device and clientGeneratedId", async () => {
    const context = await createPairedContext();
    const requestBody = {
      clientGeneratedId: "candidate-dup",
      capturedAt: "2026-05-04T00:00:00.000Z",
      detectedAt: "2026-05-04T00:00:01.000Z",
      width: 1080,
      height: 2400,
      mimeType: "image/png",
      fileSizeBytes: 2048,
    };

    const first = await SELF.fetch("http://example.com/api/screenshots/init", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify(requestBody),
    });
    const firstData = await first.json<ScreenshotInitResponse>();

    const second = await SELF.fetch("http://example.com/api/screenshots/init", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify(requestBody),
    });
    const secondData = await second.json<ScreenshotInitResponse>();

    expect(secondData.screenshotId).toBe(firstData.screenshotId);

    const allRows = await db.query.screenshots.findMany({
      where: eq(screenshots.deviceId, context.deviceId),
    });
    expect(allRows).toHaveLength(1);
  });

  it("stores uploaded bytes in local R2 and updates screenshot status through preview and original completion", async () => {
    const context = await createPairedContext();

    const initResponse = await SELF.fetch("http://example.com/api/screenshots/init", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify({
        clientGeneratedId: "candidate-flow",
        capturedAt: "2026-05-04T00:00:00.000Z",
        detectedAt: "2026-05-04T00:00:01.000Z",
        width: 1080,
        height: 2400,
        mimeType: "image/png",
        fileSizeBytes: 2048,
      }),
    });
    const initData = await initResponse.json<ScreenshotInitResponse>();

    const previewStorageKey = extractStorageKey(initData.uploadTargets.preview.url);
    const originalStorageKey = extractStorageKey(initData.uploadTargets.original.url);

    const previewBinary = new Uint8Array([1, 2, 3, 4]);
    const previewUploadResponse = await SELF.fetch(initData.uploadTargets.preview.url, {
      method: "PUT",
      headers: { "content-type": "image/jpeg" },
      body: previewBinary,
    });
    expect(previewUploadResponse.status).toBe(204);

    const previewObject = await env.SCREENSHOT_ASSETS.get(previewStorageKey);
    expect(previewObject).not.toBeNull();
    expect(previewObject?.httpMetadata?.contentType).toBe("image/jpeg");
    expect(new Uint8Array(await previewObject!.arrayBuffer())).toEqual(previewBinary);

    const previewResponse = await SELF.fetch(`http://example.com/api/screenshots/${initData.screenshotId}/preview`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify({
        storageKey: previewStorageKey,
        mimeType: "image/jpeg",
        sizeBytes: previewBinary.byteLength,
        width: 64,
        height: 142,
        blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
      }),
    });
    expect(previewResponse.status).toBe(204);

    let stored = await db.query.screenshots.findFirst({ where: eq(screenshots.id, initData.screenshotId) });
    expect(stored?.status).toBe("preview_ready");
    expect(stored?.previewStorageKey).toBe(previewStorageKey);

    const originalBinary = new Uint8Array([9, 8, 7, 6, 5]);
    const originalUploadResponse = await SELF.fetch(initData.uploadTargets.original.url, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: originalBinary,
    });
    expect(originalUploadResponse.status).toBe(204);

    const originalObject = await env.SCREENSHOT_ASSETS.get(originalStorageKey);
    expect(originalObject).not.toBeNull();
    expect(originalObject?.httpMetadata?.contentType).toBe("image/png");
    expect(new Uint8Array(await originalObject!.arrayBuffer())).toEqual(originalBinary);

    const originalResponse = await SELF.fetch(`http://example.com/api/screenshots/${initData.screenshotId}/original`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify({
        storageKey: originalStorageKey,
        mimeType: "image/png",
        sizeBytes: originalBinary.byteLength,
      }),
    });
    expect(originalResponse.status).toBe(204);

    stored = await db.query.screenshots.findFirst({ where: eq(screenshots.id, initData.screenshotId) });
    expect(stored?.status).toBe("ready");
    expect(stored?.originalStorageKey).toBe(originalStorageKey);

    const listResponse = await SELF.fetch("http://example.com/api/screenshots?limit=10", {
      headers: {
        authorization: `Bearer ${context.webSessionToken}`,
      },
    });
    expect(listResponse.status).toBe(200);

    const listData = await listResponse.json<ScreenshotListResponse>();
    expect(listData.nextCursor).toBeNull();
    expect(listData.items).toHaveLength(1);
    expect(listData.items[0]).toEqual(
      expect.objectContaining<Partial<ScreenshotRecord>>({
        id: initData.screenshotId,
        status: "ready",
        previewStorageKey,
        originalStorageKey,
      }),
    );
  });

  it("deletes a screenshot and removes stored assets", async () => {
    const context = await createPairedContext();

    const initResponse = await SELF.fetch("http://example.com/api/screenshots/init", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify({
        clientGeneratedId: "candidate-delete",
        capturedAt: "2026-05-04T00:00:00.000Z",
        detectedAt: "2026-05-04T00:00:01.000Z",
        width: 1080,
        height: 2400,
        mimeType: "image/png",
        fileSizeBytes: 2048,
      }),
    });
    const initData = await initResponse.json<ScreenshotInitResponse>();

    const previewStorageKey = extractStorageKey(initData.uploadTargets.preview.url);
    const originalStorageKey = extractStorageKey(initData.uploadTargets.original.url);

    await SELF.fetch(initData.uploadTargets.preview.url, { method: "PUT", body: new Uint8Array([1,2,3]) });
    await SELF.fetch(initData.uploadTargets.original.url, { method: "PUT", body: new Uint8Array([4,5,6]) });

    await SELF.fetch(`http://example.com/api/screenshots/${initData.screenshotId}/preview`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${context.deviceToken}` },
      body: JSON.stringify({ storageKey: previewStorageKey, mimeType: "image/jpeg", sizeBytes: 3, width: 64, height: 64, blurhash: null }),
    });

    await SELF.fetch(`http://example.com/api/screenshots/${initData.screenshotId}/original`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${context.deviceToken}` },
      body: JSON.stringify({ storageKey: originalStorageKey, mimeType: "image/png", sizeBytes: 3 }),
    });

    const deleteResponse = await SELF.fetch(`http://example.com/api/screenshots/${initData.screenshotId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${context.webSessionToken}` },
    });

    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({ screenshotId: initData.screenshotId });

    const row = await db.query.screenshots.findFirst({ where: eq(screenshots.id, initData.screenshotId) });
    expect(row).toBeUndefined();
    expect(await env.SCREENSHOT_ASSETS.get(previewStorageKey)).toBeNull();
    expect(await env.SCREENSHOT_ASSETS.get(originalStorageKey)).toBeNull();
  });

  it("marks a screenshot failed", async () => {
    const context = await createPairedContext();

    const initResponse = await SELF.fetch("http://example.com/api/screenshots/init", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify({
        clientGeneratedId: "candidate-fail",
        capturedAt: "2026-05-04T00:00:00.000Z",
        detectedAt: "2026-05-04T00:00:01.000Z",
        width: 1080,
        height: 2400,
        mimeType: "image/png",
        fileSizeBytes: 2048,
      }),
    });
    const initData = await initResponse.json<ScreenshotInitResponse>();

    const failResponse = await SELF.fetch(`http://example.com/api/screenshots/${initData.screenshotId}/fail`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify({ reason: "network_timeout" }),
    });
    expect(failResponse.status).toBe(204);

    const stored = await db.query.screenshots.findFirst({ where: eq(screenshots.id, initData.screenshotId) });
    expect(stored?.status).toBe("failed");
    expect(stored?.failedReason).toBe("network_timeout");
  });
});
