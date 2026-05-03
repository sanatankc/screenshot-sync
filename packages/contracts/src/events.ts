import type { PairingSessionStatus } from "./pairing";
import type { ScreenshotRecord } from "./screenshots";

export type PairingUpdatedEvent = {
  type: "pairing.updated";
  workspaceId: string;
  pairingSessionId: string;
  status: PairingSessionStatus;
  device: {
    id: string;
    deviceName: string;
  } | null;
};

export type ScreenshotCreatedEvent = {
  type: "screenshot.created";
  screenshot: ScreenshotRecord;
};

export type ScreenshotUpdatedEvent = {
  type: "screenshot.updated";
  screenshot: ScreenshotRecord;
};

export type ScreenshotDeletedEvent = {
  type: "screenshot.deleted";
  workspaceId: string;
  screenshotId: string;
};

export type WorkspaceEvent =
  | PairingUpdatedEvent
  | ScreenshotCreatedEvent
  | ScreenshotUpdatedEvent
  | ScreenshotDeletedEvent;
