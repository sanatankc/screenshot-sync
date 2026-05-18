import type {
  PairingUpdatedEvent,
  ScreenshotCreatedEvent,
  ScreenshotDeletedEvent,
  ScreenshotUpdatedEvent,
  ViewerPresenceUpdatedEvent,
  WorkspaceDisconnectedEvent,
  WorkspaceEvent,
} from "@screenshot-sync/contracts";
import type { Env } from "@server/lib/env";

async function publishChannelEvent(env: Env, channelId: string, event: WorkspaceEvent) {
  const stub = env.WORKSPACE_HUB.get(env.WORKSPACE_HUB.idFromName(channelId));

  await stub.fetch("https://workspace-hub.internal/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(event),
  });
}

export function publishPairingSessionEvent(env: Env, pairingSessionId: string, event: PairingUpdatedEvent) {
  return publishChannelEvent(env, `pairing:${pairingSessionId}`, event);
}

export async function publishWorkspaceEvent(env: Env, workspaceId: string, event: WorkspaceEvent) {
  return publishChannelEvent(env, `workspace:${workspaceId}`, event);
}

export function publishPairingUpdated(env: Env, workspaceId: string, event: PairingUpdatedEvent) {
  return publishWorkspaceEvent(env, workspaceId, event);
}

export function publishScreenshotCreated(env: Env, workspaceId: string, event: ScreenshotCreatedEvent) {
  return publishWorkspaceEvent(env, workspaceId, event);
}

export function publishScreenshotUpdated(env: Env, workspaceId: string, event: ScreenshotUpdatedEvent) {
  return publishWorkspaceEvent(env, workspaceId, event);
}

export function publishScreenshotDeleted(env: Env, workspaceId: string, event: ScreenshotDeletedEvent) {
  return publishWorkspaceEvent(env, workspaceId, event);
}

export function publishViewerPresenceUpdated(env: Env, workspaceId: string, event: ViewerPresenceUpdatedEvent) {
  return publishWorkspaceEvent(env, workspaceId, event);
}

export function publishWorkspaceDisconnected(env: Env, workspaceId: string, event: WorkspaceDisconnectedEvent) {
  return publishWorkspaceEvent(env, workspaceId, event);
}
