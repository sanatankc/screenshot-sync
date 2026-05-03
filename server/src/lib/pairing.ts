import { and, eq, gt } from "drizzle-orm";
import type {
  PairingCompleteRequest,
  PairingCompleteResponse,
  PairingSessionCreateRequest,
  PairingSessionCreateResponse,
  PairingUpdatedEvent,
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
import { publishPairingUpdated } from "@server/lib/workspace-hub";

const PAIRING_TTL_MS = 5 * 60 * 1000;

export async function createPairingSession(
  env: Env,
  request: PairingSessionCreateRequest,
  serverUrl: string,
): Promise<PairingSessionCreateResponse> {
  const db = getDb(env);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PAIRING_TTL_MS);

  const workspaceId = createId("ws");
  const pairingSessionId = createId("pair");
  const viewerSessionId = createId("view");
  const pairingToken = createToken("pairtok");
  const webSessionToken = createToken("webtok");

  await db.batch([
    db.insert(workspaces).values({
      id: workspaceId,
      name: request.clientName ?? null,
      activeDeviceId: null,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    }),
    db.insert(viewerSessions).values({
      id: viewerSessionId,
      workspaceId,
      sessionTokenHash: await sha256(webSessionToken),
      clientName: request.clientName ?? null,
      lastSeenAt: now,
      createdAt: now,
      expiresAt,
      revokedAt: null,
    }),
    db.insert(pairingSessions).values({
      id: pairingSessionId,
      workspaceId,
      pairingTokenHash: await sha256(pairingToken),
      status: "pending",
      expiresAt,
      createdAt: now,
      pairedAt: null,
      viewerSessionId,
      deviceId: null,
    }),
  ]);

  return {
    workspaceId,
    pairingSessionId,
    pairingToken,
    webSessionToken,
    expiresAt: expiresAt.toISOString(),
    qrPayload: {
      type: "screenshot-sync-pairing",
      serverUrl,
      workspaceId,
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
      eq(pairingSessions.workspaceId, payload.workspaceId),
      eq(pairingSessions.pairingTokenHash, pairingTokenHash),
      eq(pairingSessions.status, "pending"),
      gt(pairingSessions.expiresAt, now),
    ),
  });

  if (!pairingSession) {
    throw new Error("PAIRING_SESSION_INVALID");
  }

  const deviceId = createId("dev");
  const deviceToken = createToken("devtok");
  const deviceTokenHash = await sha256(deviceToken);

  await db.batch([
    db.insert(devices).values({
      id: deviceId,
      workspaceId: payload.workspaceId,
      deviceTokenHash,
      platform: payload.device.platform,
      deviceName: payload.device.deviceName,
      appVersion: payload.device.appVersion,
      lastSeenAt: now,
      createdAt: now,
      revokedAt: null,
    }),
    db.update(pairingSessions)
      .set({
        status: "paired",
        pairedAt: now,
        deviceId,
      })
      .where(eq(pairingSessions.id, pairingSession.id)),
    db.update(workspaces)
      .set({
        activeDeviceId: deviceId,
        updatedAt: now,
        lastActivityAt: now,
      })
      .where(eq(workspaces.id, payload.workspaceId)),
  ]);

  const pairingEvent: PairingUpdatedEvent = {
    type: "pairing.updated",
    workspaceId: payload.workspaceId,
    pairingSessionId: pairingSession.id,
    status: "paired",
    device: {
      id: deviceId,
      deviceName: payload.device.deviceName,
    },
  };

  await publishPairingUpdated(env, payload.workspaceId, pairingEvent);

  return {
    workspaceId: payload.workspaceId,
    deviceId,
    deviceToken,
  };
}
