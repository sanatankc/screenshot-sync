import { Hono } from "hono";
import type {
  PairingCompleteRequest,
  PairingSessionCreateRequest,
  ScreenshotRecord,
  WorkspaceEvent,
} from "@screenshot-sync/contracts";
import type { ScreenshotRow } from "@screenshot-sync/db-schema";
import type { Env } from "@server/lib/env";
import { WorkspaceHub } from "@server/durable/workspace-hub";
import { toScreenshotRecord } from "@server/lib/mappers";
import { completePairing, createPairingSession } from "@server/lib/pairing";

const app = new Hono<{ Bindings: Env }>();

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
