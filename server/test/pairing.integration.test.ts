import { env, runInDurableObject, SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { devices, pairingSessions, viewerSessions, workspaces } from "@screenshot-sync/db-schema";
import type {
  PairingCompleteResponse,
  PairingSessionCreateResponse,
  ViewerSessionRestoreResponse,
} from "@screenshot-sync/contracts";
import { describe, expect, it } from "vitest";
import { WorkspaceHub } from "../src";

const db = drizzle(env.DB, {
  schema: { devices, pairingSessions, viewerSessions, workspaces },
});

const devicePayload = {
  deviceIdentity: "device_identity_pixel_8",
  platform: "android" as const,
  deviceName: "Pixel 8",
  appVersion: "1.0.0",
};

describe("pairing routes", () => {
  it("creates only a temporary pairing session and viewer session", async () => {
    const response = await SELF.fetch("http://example.com/api/pairing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: "Sanatan Chrome" }),
    });

    expect(response.status).toBe(201);

    const data = await response.json<PairingSessionCreateResponse>();
    expect(data.pairingSessionId).toMatch(/^pair_/);
    expect(data.pairingToken).toMatch(/^pairtok_/);
    expect(data.webSessionToken).toMatch(/^webtok_/);
    expect(data.qrPayload.pairingSessionId).toBe(data.pairingSessionId);

    const pairingSession = await db.query.pairingSessions.findFirst({
      where: eq(pairingSessions.id, data.pairingSessionId),
    });
    const viewerSession = await db.query.viewerSessions.findFirst({
      where: eq(viewerSessions.id, pairingSession!.viewerSessionId!),
    });
    const allWorkspaces = await db.query.workspaces.findMany();

    expect(pairingSession?.status).toBe("pending");
    expect(pairingSession?.workspaceId).toBeNull();
    expect(viewerSession?.workspaceId).toBeNull();
    expect(viewerSession?.clientName).toBe("Sanatan Chrome");
    expect(viewerSession?.expiresAt?.getTime()).toBeGreaterThan(pairingSession!.expiresAt!.getTime());
    expect(allWorkspaces).toHaveLength(0);
  });

  it("rejects invalid pairing completion tokens", async () => {
    const createResponse = await SELF.fetch("http://example.com/api/pairing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: "Sanatan Chrome" }),
    });
    const created = await createResponse.json<PairingSessionCreateResponse>();

    const response = await SELF.fetch("http://example.com/api/pairing/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pairingSessionId: created.pairingSessionId,
        pairingToken: "pairtok_invalid",
        device: devicePayload,
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "PAIRING_SESSION_INVALID" });
  });

  it("creates one permanent workspace for the first pairing and reuses it for later desktops", async () => {
    const firstCreate = await SELF.fetch("http://example.com/api/pairing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: "MacBook Chrome" }),
    });
    const firstSession = await firstCreate.json<PairingSessionCreateResponse>();

    const firstCompleteResponse = await SELF.fetch("http://example.com/api/pairing/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pairingSessionId: firstSession.pairingSessionId,
        pairingToken: firstSession.pairingToken,
        device: devicePayload,
      }),
    });

    expect(firstCompleteResponse.status).toBe(200);
    const firstComplete = await firstCompleteResponse.json<PairingCompleteResponse>();

    const secondCreate = await SELF.fetch("http://example.com/api/pairing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: "Studio Display Safari" }),
    });
    const secondSession = await secondCreate.json<PairingSessionCreateResponse>();

    const secondCompleteResponse = await SELF.fetch("http://example.com/api/pairing/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pairingSessionId: secondSession.pairingSessionId,
        pairingToken: secondSession.pairingToken,
        device: {
          ...devicePayload,
          appVersion: "1.0.1",
        },
      }),
    });

    expect(secondCompleteResponse.status).toBe(200);
    const secondComplete = await secondCompleteResponse.json<PairingCompleteResponse>();

    expect(secondComplete.workspaceId).toBe(firstComplete.workspaceId);
    expect(secondComplete.deviceId).toBe(firstComplete.deviceId);
    expect(secondComplete.deviceToken).not.toBe(firstComplete.deviceToken);

    const allWorkspaces = await db.query.workspaces.findMany();
    const allDevices = await db.query.devices.findMany();

    expect(allWorkspaces).toHaveLength(1);
    expect(allDevices).toHaveLength(1);

    const pairingSession = await db.query.pairingSessions.findFirst({
      where: eq(pairingSessions.id, secondSession.pairingSessionId),
    });
    const viewerSession = await db.query.viewerSessions.findFirst({
      where: eq(viewerSessions.id, pairingSession!.viewerSessionId!),
    });
    const device = await db.query.devices.findFirst({
      where: eq(devices.id, firstComplete.deviceId),
    });

    expect(pairingSession?.workspaceId).toBe(firstComplete.workspaceId);
    expect(pairingSession?.deviceId).toBe(firstComplete.deviceId);
    expect(viewerSession?.workspaceId).toBe(firstComplete.workspaceId);
    expect(device?.appVersion).toBe("1.0.1");
  });

  it("restores a viewer session back onto the existing workspace", async () => {
    const createResponse = await SELF.fetch("http://example.com/api/pairing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: "MacBook Chrome" }),
    });
    const created = await createResponse.json<PairingSessionCreateResponse>();

    const pairingSessionBeforeRestore = await db.query.pairingSessions.findFirst({
      where: eq(pairingSessions.id, created.pairingSessionId),
    });
    const viewerSessionBeforeRestore = await db.query.viewerSessions.findFirst({
      where: eq(viewerSessions.id, pairingSessionBeforeRestore!.viewerSessionId!),
    });

    await SELF.fetch("http://example.com/api/pairing/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pairingSessionId: created.pairingSessionId,
        pairingToken: created.pairingToken,
        device: devicePayload,
      }),
    });

    const restoreResponse = await SELF.fetch("http://example.com/api/viewer/session", {
      headers: {
        authorization: `Bearer ${created.webSessionToken}`,
      },
    });

    expect(restoreResponse.status).toBe(200);
    const restored = await restoreResponse.json<ViewerSessionRestoreResponse>();
    expect(restored.viewerSessionId).toMatch(/^view_/);
    expect(restored.workspaceId).toMatch(/^ws_/);
    expect(restored.clientName).toBe("MacBook Chrome");

    const viewerSessionAfterRestore = await db.query.viewerSessions.findFirst({
      where: eq(viewerSessions.id, restored.viewerSessionId),
    });

    expect(viewerSessionAfterRestore?.expiresAt?.getTime()).toBeGreaterThan(
      viewerSessionBeforeRestore!.expiresAt!.getTime(),
    );
  });

  it("stores the pairing event in both the pairing-session hub and the workspace hub", async () => {
    const createResponse = await SELF.fetch("http://example.com/api/pairing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: "MacBook Chrome" }),
    });
    const created = await createResponse.json<PairingSessionCreateResponse>();

    const completeResponse = await SELF.fetch("http://example.com/api/pairing/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pairingSessionId: created.pairingSessionId,
        pairingToken: created.pairingToken,
        device: devicePayload,
      }),
    });
    const completed = await completeResponse.json<PairingCompleteResponse>();

    const pairingStub = env.WORKSPACE_HUB.get(env.WORKSPACE_HUB.idFromName(`pairing:${created.pairingSessionId}`));
    const workspaceStub = env.WORKSPACE_HUB.get(env.WORKSPACE_HUB.idFromName(`workspace:${completed.workspaceId}`));

    const [pairingEvent, workspaceEvent] = await Promise.all([
      runInDurableObject(pairingStub, (_instance: WorkspaceHub, state) => state.storage.get("lastPairingUpdatedEvent")),
      runInDurableObject(workspaceStub, (_instance: WorkspaceHub, state) => state.storage.get("lastPairingUpdatedEvent")),
    ]);

    expect(pairingEvent).toEqual({
      type: "pairing.updated",
      workspaceId: completed.workspaceId,
      pairingSessionId: created.pairingSessionId,
      status: "paired",
      device: {
        id: completed.deviceId,
        deviceName: "Pixel 8",
      },
    });
    expect(workspaceEvent).toEqual(pairingEvent);
  });
});
