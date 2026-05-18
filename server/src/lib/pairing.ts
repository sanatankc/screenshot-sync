import { and, eq, gt, isNull, or } from "drizzle-orm";
import type {
  PairingCompleteRequest,
  PairingCompleteResponse,
  PairingSessionCreateRequest,
  PairingSessionCreateResponse,
  PairingUpdatedEvent,
  WorkspaceDisconnectedEvent,
  ViewerSessionRestoreResponse,
  ViewerSessionUpdateRequest,
  ViewerSessionUpdateResponse,
} from "@screenshot-sync/contracts";
import {
  devices,
  pairingSessions,
  viewerSessions,
  workspaces,
} from "@screenshot-sync/db-schema";
import type { Env } from "@server/lib/env";
import { createId, createToken, sha256 } from "@server/lib/crypto";
import { getDb } from "@server/lib/db";
import { publishPairingSessionEvent, publishPairingUpdated, publishWorkspaceDisconnected } from "@server/lib/workspace-hub";

const PAIRING_TTL_MS = 5 * 60 * 1000;
const VIEWER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createPairingSession(
  env: Env,
  request: PairingSessionCreateRequest,
): Promise<PairingSessionCreateResponse> {
  const db = getDb(env);
  const now = new Date();
  const pairingExpiresAt = new Date(now.getTime() + PAIRING_TTL_MS);
  const viewerSessionExpiresAt = new Date(now.getTime() + VIEWER_SESSION_TTL_MS);

  const pairingSessionId = createId("pair");
  const viewerSessionId = createId("view");
  const pairingToken = createToken("pairtok");
  const webSessionToken = createToken("webtok");

  await db.batch([
    db.insert(viewerSessions).values({
      id: viewerSessionId,
      workspaceId: null,
      sessionTokenHash: await sha256(webSessionToken),
      clientName: request.clientName ?? null,
      lastSeenAt: now,
      createdAt: now,
      expiresAt: viewerSessionExpiresAt,
      revokedAt: null,
    }),
    db.insert(pairingSessions).values({
      id: pairingSessionId,
      workspaceId: null,
      pairingTokenHash: await sha256(pairingToken),
      status: "pending",
      expiresAt: pairingExpiresAt,
      createdAt: now,
      pairedAt: null,
      viewerSessionId,
      deviceId: null,
    }),
  ]);

  return {
    pairingSessionId,
    pairingToken,
    webSessionToken,
    expiresAt: pairingExpiresAt.toISOString(),
    qrPayload: {
      type: "screenshot-sync-pairing",
      pairingSessionId,
      pairingToken,
    },
  };
}

export async function completePairing(
  env: Env,
  payload: PairingCompleteRequest,
): Promise<PairingCompleteResponse> {
  const db = getDb(env);
  const now = new Date();
  const pairingTokenHash = await sha256(payload.pairingToken);

  const pairingSession = await db.query.pairingSessions.findFirst({
    where: and(
      eq(pairingSessions.id, payload.pairingSessionId),
      eq(pairingSessions.pairingTokenHash, pairingTokenHash),
      eq(pairingSessions.status, "pending"),
      gt(pairingSessions.expiresAt, now),
    ),
  });

  if (!pairingSession?.viewerSessionId) {
    throw new Error("PAIRING_SESSION_INVALID");
  }

  const deviceIdentityHash = await sha256(payload.device.deviceIdentity);
  const existingDevice = await db.query.devices.findFirst({
    where: eq(devices.deviceIdentityHash, deviceIdentityHash),
  });

  const deviceToken = createToken("devtok");
  const deviceTokenHash = await sha256(deviceToken);

  let workspaceId = existingDevice?.workspaceId ?? null;
  let deviceId = existingDevice?.id ?? null;

  if (!workspaceId || !deviceId) {
    workspaceId = createId("ws");
    deviceId = createId("dev");

    try {
      await db.batch([
        db.insert(workspaces).values({
          id: workspaceId,
          name: payload.device.deviceName,
          activeDeviceId: deviceId,
          createdAt: now,
          updatedAt: now,
          lastActivityAt: now,
        }),
        db.insert(devices).values({
          id: deviceId,
          workspaceId,
          deviceIdentityHash,
          deviceTokenHash,
          platform: payload.device.platform,
          deviceName: payload.device.deviceName,
          appVersion: payload.device.appVersion,
          lastSeenAt: now,
          createdAt: now,
          revokedAt: null,
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("devices.device_identity_hash") && !message.includes("SQLITE_CONSTRAINT")) {
        throw error;
      }

      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
      const racedDevice = await db.query.devices.findFirst({
        where: eq(devices.deviceIdentityHash, deviceIdentityHash),
      });

      if (!racedDevice?.workspaceId || !racedDevice.id) {
        throw error;
      }

      workspaceId = racedDevice.workspaceId;
      deviceId = racedDevice.id;

      await db.batch([
        db.update(devices)
          .set({
            deviceTokenHash,
            platform: payload.device.platform,
            deviceName: payload.device.deviceName,
            appVersion: payload.device.appVersion,
            lastSeenAt: now,
          })
          .where(eq(devices.id, deviceId)),
        db.update(workspaces)
          .set({
            activeDeviceId: deviceId,
            updatedAt: now,
            lastActivityAt: now,
          })
          .where(eq(workspaces.id, workspaceId)),
      ]);
    }
  } else {
    await db.batch([
      db.update(devices)
        .set({
          deviceTokenHash,
          platform: payload.device.platform,
          deviceName: payload.device.deviceName,
          appVersion: payload.device.appVersion,
          lastSeenAt: now,
          revokedAt: null,
        })
        .where(eq(devices.id, deviceId)),
      db.update(workspaces)
        .set({
          activeDeviceId: deviceId,
          updatedAt: now,
          lastActivityAt: now,
        })
        .where(eq(workspaces.id, workspaceId)),
    ]);
  }

  await db.batch([
    db.update(viewerSessions)
      .set({
        workspaceId,
        lastSeenAt: now,
        revokedAt: null,
      })
      .where(eq(viewerSessions.id, pairingSession.viewerSessionId)),
    db.update(pairingSessions)
      .set({
        workspaceId,
        status: "paired",
        pairedAt: now,
        deviceId,
      })
      .where(eq(pairingSessions.id, pairingSession.id)),
  ]);

  const pairingEvent: PairingUpdatedEvent = {
    type: "pairing.updated",
    workspaceId,
    pairingSessionId: pairingSession.id,
    status: "paired",
    device: {
      id: deviceId,
      deviceName: payload.device.deviceName,
    },
  };

  await Promise.all([
    publishPairingSessionEvent(env, pairingSession.id, pairingEvent),
    publishPairingUpdated(env, workspaceId, pairingEvent),
  ]);

  const viewerSession = await db.query.viewerSessions.findFirst({
    where: eq(viewerSessions.id, pairingSession.viewerSessionId),
  });

  return {
    workspaceId,
    deviceId,
    deviceToken,
    clientName: viewerSession?.clientName ?? null,
  };
}

export async function restoreViewerSession(
  env: Env,
  viewerSessionId: string,
): Promise<ViewerSessionRestoreResponse> {
  const db = getDb(env);
  const now = new Date();
  const viewerSessionExpiresAt = new Date(now.getTime() + VIEWER_SESSION_TTL_MS);
  const session = await db.query.viewerSessions.findFirst({
    where: and(
      eq(viewerSessions.id, viewerSessionId),
      isNull(viewerSessions.revokedAt),
      or(isNull(viewerSessions.expiresAt), gt(viewerSessions.expiresAt, now)),
    ),
  });

  if (!session?.workspaceId) {
    throw new Error("VIEWER_SESSION_NOT_RESTORABLE");
  }

  await db.update(viewerSessions)
    .set({
      lastSeenAt: now,
      expiresAt: viewerSessionExpiresAt,
    })
    .where(eq(viewerSessions.id, session.id));

  return {
    viewerSessionId: session.id,
    workspaceId: session.workspaceId,
    clientName: session.clientName ?? null,
  };
}

export async function updateViewerSession(
  env: Env,
  viewerSessionId: string,
  payload: ViewerSessionUpdateRequest,
): Promise<ViewerSessionUpdateResponse> {
  const db = getDb(env);
  const now = new Date();
  const clientName = payload.clientName?.trim() || null;

  await db.update(viewerSessions)
    .set({
      clientName,
      lastSeenAt: now,
    })
    .where(eq(viewerSessions.id, viewerSessionId));

  return {
    viewerSessionId,
    clientName,
  };
}

export async function disconnectViewer(
  env: Env,
  viewerSessionId: string,
): Promise<void> {
  const db = getDb(env);
  const now = new Date();
  const session = await db.query.viewerSessions.findFirst({
    where: and(eq(viewerSessions.id, viewerSessionId), isNull(viewerSessions.revokedAt)),
  });

  if (!session?.workspaceId) {
    return;
  }

  await db.batch([
    db.update(viewerSessions)
      .set({ revokedAt: now, lastSeenAt: now })
      .where(and(eq(viewerSessions.workspaceId, session.workspaceId), isNull(viewerSessions.revokedAt))),
    db.update(devices)
      .set({ revokedAt: now, lastSeenAt: now })
      .where(and(eq(devices.workspaceId, session.workspaceId), isNull(devices.revokedAt))),
  ]);

  const event: WorkspaceDisconnectedEvent = {
    type: "workspace.disconnected",
    workspaceId: session.workspaceId,
    origin: "viewer",
  };

  await publishWorkspaceDisconnected(env, session.workspaceId, event);
}

export async function disconnectDevice(
  env: Env,
  deviceId: string,
): Promise<void> {
  const db = getDb(env);
  const now = new Date();
  const device = await db.query.devices.findFirst({
    where: and(eq(devices.id, deviceId), isNull(devices.revokedAt)),
  });

  if (!device) {
    return;
  }

  await db.batch([
    db.update(devices)
      .set({ revokedAt: now, lastSeenAt: now })
      .where(and(eq(devices.workspaceId, device.workspaceId), isNull(devices.revokedAt))),
    db.update(viewerSessions)
      .set({ revokedAt: now, lastSeenAt: now })
      .where(and(eq(viewerSessions.workspaceId, device.workspaceId), isNull(viewerSessions.revokedAt))),
  ]);

  const event: WorkspaceDisconnectedEvent = {
    type: "workspace.disconnected",
    workspaceId: device.workspaceId,
    origin: "device",
  };

  await publishWorkspaceDisconnected(env, device.workspaceId, event);
}
