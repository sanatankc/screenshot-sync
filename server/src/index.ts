import { Hono } from "hono";
import type {
  PairingCompleteRequest,
  PairingSessionCreateRequest,
  ScreenshotFailRequest,
  ScreenshotInitRequest,
  ScreenshotOriginalCompleteRequest,
  ScreenshotPreviewCompleteRequest,
  ScreenshotRecord,
  WorkspaceEvent,
} from "@screenshot-sync/contracts";
import type { ScreenshotRow } from "@screenshot-sync/db-schema";
import type { Env } from "@server/lib/env";
import { WorkspaceHub } from "@server/durable/workspace-hub";
import { deviceAuth, type AppVariables, viewerAuth } from "@server/lib/middleware";
import { toScreenshotRecord } from "@server/lib/mappers";
import { completePairing, createPairingSession } from "@server/lib/pairing";
import { publishScreenshotCreated, publishScreenshotUpdated } from "@server/lib/workspace-hub";
import { getStorageKeyFromUploadPath, storeUpload } from "@server/lib/uploads";
import {
  completeOriginalUpload,
  completePreviewUpload,
  failScreenshot,
  initScreenshot,
  listScreenshots,
} from "@server/lib/screenshots";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const exampleScreenshotRow = {
  id: "shot_example",
  workspaceId: "ws_example",
  deviceId: "dev_example",
  clientGeneratedId: null,
  status: "pending",
  capturedAt: new Date(0),
  detectedAt: new Date(0),
  createdAt: new Date(0),
  updatedAt: new Date(0),
  failedReason: null,
  width: 1080,
  height: 2400,
  mimeType: "image/png",
  fileSizeBytes: 1024,
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
} satisfies ScreenshotRow;

const exampleTransportScreenshot: ScreenshotRecord = toScreenshotRecord(exampleScreenshotRow);

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "screenshot-sync-server",
    capabilities: {
      workers: true,
      durableObjects: true,
      d1: true,
      r2: true,
      queues: true,
      sharedContractsReady: true,
    },
    sharedContractExample: "pairing.updated" satisfies WorkspaceEvent["type"],
    screenshotTransportExample: exampleTransportScreenshot.status,
  });
});

app.post("/api/pairing/session", async (c) => {
  const payload = (await c.req.json().catch(() => ({}))) as PairingSessionCreateRequest;
  const serverUrl = new URL(c.req.url).origin;
  const result = await createPairingSession(c.env, payload, serverUrl);
  return c.json(result, 201);
});

app.post("/api/pairing/complete", async (c) => {
  const payload = (await c.req.json()) as PairingCompleteRequest;

  try {
    const result = await completePairing(c.env, payload);
    return c.json(result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "PAIRING_COMPLETE_FAILED";
    const status = message === "PAIRING_SESSION_INVALID" ? 400 : 500;

    return c.json(
      {
        ok: false,
        error: message,
      },
      status,
    );
  }
});

app.get("/api/screenshots", viewerAuth, async (c) => {
  const viewerSession = c.get("viewerSession");
  const result = await listScreenshots(c.env, viewerSession.workspaceId, c.req.query("limit") ?? null);
  return c.json(result, 200);
});

app.post("/api/screenshots/init", deviceAuth, async (c) => {
  const device = c.get("device");
  const payload = (await c.req.json()) as ScreenshotInitRequest;
  const serverUrl = new URL(c.req.url).origin;
  const result = await initScreenshot(c.env, {
    workspaceId: device.workspaceId,
    deviceId: device.id,
    request: payload,
    serverUrl,
  });
  await publishScreenshotCreated(c.env, device.workspaceId, {
    type: "screenshot.created",
    screenshot: result.screenshot,
  });
  return c.json(
    {
      screenshotId: result.screenshotId,
      status: result.status,
      uploadTargets: result.uploadTargets,
    },
    201,
  );
});

app.post("/api/screenshots/:id/preview", deviceAuth, async (c) => {
  try {
    const device = c.get("device");
    const payload = (await c.req.json()) as ScreenshotPreviewCompleteRequest;
    const screenshot = await completePreviewUpload(c.env, {
      workspaceId: device.workspaceId,
      deviceId: device.id,
      screenshotId: c.req.param("id"),
      request: payload,
    });
    await publishScreenshotUpdated(c.env, device.workspaceId, {
      type: "screenshot.updated",
      screenshot,
    });
    return c.body(null, 204);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SCREENSHOT_UPDATE_FAILED";
    const status = message === "SCREENSHOT_NOT_FOUND" ? 404 : 500;
    return c.json({ ok: false, error: message }, status);
  }
});

app.post("/api/screenshots/:id/original", deviceAuth, async (c) => {
  try {
    const device = c.get("device");
    const payload = (await c.req.json()) as ScreenshotOriginalCompleteRequest;
    const screenshot = await completeOriginalUpload(c.env, {
      workspaceId: device.workspaceId,
      deviceId: device.id,
      screenshotId: c.req.param("id"),
      request: payload,
    });
    await publishScreenshotUpdated(c.env, device.workspaceId, {
      type: "screenshot.updated",
      screenshot,
    });
    return c.body(null, 204);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SCREENSHOT_UPDATE_FAILED";
    const status = message === "SCREENSHOT_NOT_FOUND" ? 404 : 500;
    return c.json({ ok: false, error: message }, status);
  }
});

app.post("/api/screenshots/:id/fail", deviceAuth, async (c) => {
  try {
    const device = c.get("device");
    const payload = (await c.req.json()) as ScreenshotFailRequest;
    const screenshot = await failScreenshot(c.env, {
      workspaceId: device.workspaceId,
      deviceId: device.id,
      screenshotId: c.req.param("id"),
      request: payload,
    });
    await publishScreenshotUpdated(c.env, device.workspaceId, {
      type: "screenshot.updated",
      screenshot,
    });
    return c.body(null, 204);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SCREENSHOT_UPDATE_FAILED";
    const status = message === "SCREENSHOT_NOT_FOUND" ? 404 : 500;
    return c.json({ ok: false, error: message }, status);
  }
});

app.put("/internal/uploads/*", async (c) => {
  const storageKey = getStorageKeyFromUploadPath(new URL(c.req.url).pathname);

  if (!storageKey) {
    return c.json({ ok: false, error: "UPLOAD_KEY_INVALID" }, 400);
  }

  await storeUpload(c.env, storageKey, c.req.raw);
  return c.body(null, 204);
});

app.get("/api/workspaces/:workspaceId/ws", viewerAuth, async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const viewerSession = c.get("viewerSession");

  if (viewerSession.workspaceId !== workspaceId) {
    return c.json({ ok: false, error: "WORKSPACE_FORBIDDEN" }, 403);
  }

  const stub = c.env.WORKSPACE_HUB.get(c.env.WORKSPACE_HUB.idFromName(workspaceId));
  const websocketRequest = new Request("https://workspace-hub.internal/websocket", c.req.raw);
  return stub.fetch(websocketRequest);
});

app.all("*", (c) => {
  return c.json(
    {
      ok: false,
      message: "Requested route is not implemented yet.",
    },
    404,
  );
});

export { WorkspaceHub };
export default app;
