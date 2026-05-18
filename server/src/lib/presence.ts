import { and, desc, eq, isNull } from "drizzle-orm";
import type { DevicePresenceRecord, ViewerPresenceRecord, WorkspacePresenceResponse } from "@screenshot-sync/contracts";
import { devices, viewerSessions } from "@screenshot-sync/db-schema";
import type { Env } from "@server/lib/env";
import { getDb } from "@server/lib/db";

const DEVICE_ONLINE_WINDOW_MS = 2 * 60 * 1000;

export type ActiveViewerPresence = {
  activeViewerSessionIds: string[];
};

export function isDeviceOnline(lastSeenAt: Date | null, now = new Date()) {
  if (!lastSeenAt) return false;
  return now.getTime() - lastSeenAt.getTime() <= DEVICE_ONLINE_WINDOW_MS;
}

export async function listWorkspacePresence(
  env: Env,
  workspaceId: string,
  activeViewerSessionIds: string[],
): Promise<WorkspacePresenceResponse> {
  const db = getDb(env);
  const now = new Date();
  const activeSet = new Set(activeViewerSessionIds);

  const [viewerRows, deviceRows] = await Promise.all([
    db.select({
      id: viewerSessions.id,
      clientName: viewerSessions.clientName,
      lastSeenAt: viewerSessions.lastSeenAt,
    })
      .from(viewerSessions)
      .where(and(eq(viewerSessions.workspaceId, workspaceId), isNull(viewerSessions.revokedAt)))
      .orderBy(desc(viewerSessions.lastSeenAt)),
    db.select({
      id: devices.id,
      deviceName: devices.deviceName,
      appVersion: devices.appVersion,
      lastSeenAt: devices.lastSeenAt,
    })
      .from(devices)
      .where(and(eq(devices.workspaceId, workspaceId), isNull(devices.revokedAt)))
      .orderBy(desc(devices.lastSeenAt)),
  ]);

  const viewers: ViewerPresenceRecord[] = viewerRows.map((row) => ({
    viewerSessionId: row.id,
    clientName: row.clientName ?? null,
    status: activeSet.has(row.id) ? "online" : "offline",
    lastSeenAt: row.lastSeenAt.toISOString(),
  }));

  const devicesList: DevicePresenceRecord[] = deviceRows.map((row) => ({
    deviceId: row.id,
    deviceName: row.deviceName,
    appVersion: row.appVersion,
    status: isDeviceOnline(row.lastSeenAt, now) ? "online" : "offline",
    lastSeenAt: row.lastSeenAt.toISOString(),
  }));

  return { viewers, devices: devicesList };
}
