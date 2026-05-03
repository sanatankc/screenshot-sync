import { and, eq, gt, isNull, or } from "drizzle-orm";
import { devices, viewerSessions } from "@screenshot-sync/db-schema";
import type { Env } from "@server/lib/env";
import { getDb } from "@server/lib/db";
import { sha256 } from "@server/lib/crypto";

function readBearerToken(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireDevice(env: Env, authorizationHeader: string | null) {
  const token = readBearerToken(authorizationHeader);

  if (!token) {
    throw new Error("DEVICE_UNAUTHORIZED");
  }

  const db = getDb(env);
  const tokenHash = await sha256(token);
  const device = await db.query.devices.findFirst({
    where: and(eq(devices.deviceTokenHash, tokenHash), isNull(devices.revokedAt)),
  });

  if (!device) {
    throw new Error("DEVICE_UNAUTHORIZED");
  }

  return device;
}

export async function requireViewerSession(env: Env, authorizationHeader: string | null) {
  const token = readBearerToken(authorizationHeader);

  if (!token) {
    throw new Error("VIEWER_UNAUTHORIZED");
  }

  const db = getDb(env);
  const tokenHash = await sha256(token);
  const now = new Date();
  const session = await db.query.viewerSessions.findFirst({
    where: and(
      eq(viewerSessions.sessionTokenHash, tokenHash),
      isNull(viewerSessions.revokedAt),
      or(isNull(viewerSessions.expiresAt), gt(viewerSessions.expiresAt, now)),
    ),
  });

  if (!session) {
    throw new Error("VIEWER_UNAUTHORIZED");
  }

  return session;
}
