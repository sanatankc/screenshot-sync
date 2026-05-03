import { Hono } from "hono";
import type { ScreenshotRecord, WorkspaceEvent } from "@screenshot-sync/contracts";
import type { ScreenshotRow } from "@screenshot-sync/db-schema";
import type { Env } from "@server/lib/env";
import { WorkspaceHub } from "@server/durable/workspace-hub";
import { toScreenshotRecord } from "@server/lib/mappers";

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

app.all("*", (c) => {
  return c.json(
    {
      ok: false,
      message: "Server scaffold is ready. API routes will be added in later tasks.",
    },
    501,
  );
});

export { WorkspaceHub };
export default app;
