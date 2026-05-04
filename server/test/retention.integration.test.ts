import { env, SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { screenshots } from "@screenshot-sync/db-schema";
import type {
  PairingCompleteResponse,
  PairingSessionCreateResponse,
  ScreenshotInitResponse,
  WorkspaceEvent,
} from "@screenshot-sync/contracts";
import { describe, expect, it } from "vitest";

const db = drizzle(env.DB, { schema: { screenshots } });

function waitForMessages(socket: WebSocket, count: number): Promise<WorkspaceEvent[]> {
  return new Promise((resolve, reject) => {
    const messages: WorkspaceEvent[] = [];
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for websocket messages")), 2000);

    const handler = (event: MessageEvent) => {
      messages.push(JSON.parse(String(event.data)) as WorkspaceEvent);
      if (messages.length >= count) {
        clearTimeout(timeout);
        socket.removeEventListener("message", handler);
        resolve(messages);
      }
    };

    socket.addEventListener("message", handler);
  });
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
      workspaceId: pairingSession.workspaceId,
      pairingSessionId: pairingSession.pairingSessionId,
      pairingToken: pairingSession.pairingToken,
      device: {
        platform: "android",
        deviceName: "Pixel 8",
        appVersion: "1.0.0",
      },
    }),
  });
  const pairingComplete = await pairingCompleteResponse.json<PairingCompleteResponse>();

  return {
    workspaceId: pairingSession.workspaceId,
    webSessionToken: pairingSession.webSessionToken,
    deviceToken: pairingComplete.deviceToken,
    deviceId: pairingComplete.deviceId,
  };
}

function createSeedRows(workspaceId: string, deviceId: string, count: number, startTimeMs: number) {
  return Array.from({ length: count }, (_, index) => {
    const timestamp = new Date(startTimeMs + index);
    return {
      id: `shot_seed_${index}`,
      workspaceId,
      deviceId,
      clientGeneratedId: `seed-${index}`,
      status: "ready" as const,
      capturedAt: timestamp,
      detectedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      failedReason: null,
      width: 1080,
      height: 2400,
      mimeType: "image/png",
      fileSizeBytes: 1024,
      previewStorageKey: `${workspaceId}/seed-${index}/preview.jpg`,
      previewMimeType: "image/jpeg",
      previewSizeBytes: 123,
      previewWidth: 64,
      previewHeight: 142,
      blurhash: null,
      previewUploadedAt: timestamp,
      originalStorageKey: `${workspaceId}/seed-${index}/original.png`,
      originalMimeType: "image/png",
      originalSizeBytes: 1024,
      originalUploadedAt: timestamp,
      deletedAt: null,
    };
  });
}


async function insertSeedRows(rows: ReturnType<typeof createSeedRows>) {
  for (let index = 0; index < rows.length; index += 3) {
    await db.insert(screenshots).values(rows.slice(index, index + 3));
  }
}

describe("retention cleanup", () => {
  it("keeps the newest 50, deletes older metadata and local R2 objects, and emits screenshot.deleted", async () => {
    const context = await createPairedContext();
    const oldBaseTime = Date.now() - (2 * 60 * 60 * 1000);
    const seedRows = createSeedRows(context.workspaceId, context.deviceId, 50, oldBaseTime);

    await insertSeedRows(seedRows);
    for (const row of seedRows) {
      await env.SCREENSHOT_ASSETS.put(row.previewStorageKey!, new Uint8Array([1, 2, 3]));
      await env.SCREENSHOT_ASSETS.put(row.originalStorageKey!, new Uint8Array([4, 5, 6]));
    }

    const oldestRow = seedRows[0];

    const wsResponse = await SELF.fetch(`http://example.com/api/workspaces/${context.workspaceId}/ws`, {
      headers: {
        authorization: `Bearer ${context.webSessionToken}`,
        Upgrade: "websocket",
      },
    });
    const socket = wsResponse.webSocket!;
    socket.accept();

    const messagesPromise = waitForMessages(socket, 2);

    const initResponse = await SELF.fetch("http://example.com/api/screenshots/init", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify({
        clientGeneratedId: "candidate-retention-old",
        capturedAt: "2026-05-04T00:00:00.000Z",
        detectedAt: "2026-05-04T00:00:01.000Z",
        width: 1080,
        height: 2400,
        mimeType: "image/png",
        fileSizeBytes: 2048,
      }),
    });
    expect(initResponse.status).toBe(201);
    const initData = await initResponse.json<ScreenshotInitResponse>();

    const messages = await messagesPromise;
    expect(messages[0].type).toBe("screenshot.created");
    expect(messages[1]).toEqual({
      type: "screenshot.deleted",
      workspaceId: context.workspaceId,
      screenshotId: oldestRow.id,
    });

    const remainingRows = await db.query.screenshots.findMany({
      where: eq(screenshots.workspaceId, context.workspaceId),
    });
    expect(remainingRows).toHaveLength(50);
    expect(remainingRows.some((row) => row.id === oldestRow.id)).toBe(false);
    expect(remainingRows.some((row) => row.id === initData.screenshotId)).toBe(true);

    expect(await env.SCREENSHOT_ASSETS.get(oldestRow.previewStorageKey!)).toBeNull();
    expect(await env.SCREENSHOT_ASSETS.get(oldestRow.originalStorageKey!)).toBeNull();

    socket.close(1000, "done");
  });

  it("keeps more than 50 screenshots when they are all within the last hour", async () => {
    const context = await createPairedContext();
    const recentBaseTime = Date.now() - (30 * 60 * 1000);
    const seedRows = createSeedRows(context.workspaceId, context.deviceId, 70, recentBaseTime);

    await insertSeedRows(seedRows);

    const initResponse = await SELF.fetch("http://example.com/api/screenshots/init", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${context.deviceToken}`,
      },
      body: JSON.stringify({
        clientGeneratedId: "candidate-retention-recent",
        capturedAt: "2026-05-04T00:00:00.000Z",
        detectedAt: "2026-05-04T00:00:01.000Z",
        width: 1080,
        height: 2400,
        mimeType: "image/png",
        fileSizeBytes: 2048,
      }),
    });
    expect(initResponse.status).toBe(201);

    const remainingRows = await db.query.screenshots.findMany({
      where: eq(screenshots.workspaceId, context.workspaceId),
    });
    expect(remainingRows).toHaveLength(71);
  });
});
