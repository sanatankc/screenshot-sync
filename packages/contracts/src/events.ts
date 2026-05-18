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

export type ViewerPresenceStatus = "online" | "offline";

export type ViewerPresenceUpdatedEvent = {
  type: "viewer.presence.updated";
  viewerSessionId: string;
  clientName: string | null;
  status: ViewerPresenceStatus;
  lastSeenAt: string;
};

export type WorkspaceDisconnectedEvent = {
  type: "workspace.disconnected";
  workspaceId: string;
  origin: "viewer" | "device";
};

export type ScreenshotDeletedEvent = {
  type: "screenshot.deleted";
  screenshotId: string;
};

export type WorkspaceEvent =
  | PairingUpdatedEvent
  | ViewerPresenceUpdatedEvent
  | WorkspaceDisconnectedEvent
  | ScreenshotCreatedEvent
  | ScreenshotUpdatedEvent
  | ScreenshotDeletedEvent;
