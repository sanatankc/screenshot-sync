import { env, runInDurableObject, SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { devices, pairingSessions, workspaces } from "@screenshot-sync/db-schema";
import type {
  PairingCompleteResponse,
  PairingSessionCreateResponse,
} from "@screenshot-sync/contracts";
import { describe, expect, it } from "vitest";
import { WorkspaceHub } from "../src";

const db = drizzle(env.DB, {
  schema: { devices, pairingSessions, workspaces },
});

describe("pairing routes", () => {
  it("creates a pairing session with workspace, viewer session, and qr payload", async () => {
    const response = await SELF.fetch("http://example.com/api/pairing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: "Sanatan Chrome" }),
    });

    expect(response.status).toBe(201);

    const data = await response.json<PairingSessionCreateResponse>();
    expect(data.workspaceId).toMatch(/^ws_/);
    expect(data.pairingSessionId).toMatch(/^pair_/);
    expect(data.pairingToken).toMatch(/^pairtok_/);
    expect(data.webSessionToken).toMatch(/^webtok_/);
    expect(data.qrPayload.workspaceId).toBe(data.workspaceId);
    expect(data.qrPayload.pairingSessionId).toBe(data.pairingSessionId);

    const pairingSession = await db.query.pairingSessions.findFirst({
      where: eq(pairingSessions.id, data.pairingSessionId),
    });
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, data.workspaceId),
    });

    expect(pairingSession?.status).toBe("pending");
    expect(workspace?.name).toBe("Sanatan Chrome");
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
        workspaceId: created.workspaceId,
        pairingSessionId: created.pairingSessionId,
        pairingToken: "pairtok_invalid",
        device: {
          platform: "android",
          deviceName: "Pixel 8",
          appVersion: "1.0.0",
        },
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "PAIRING_SESSION_INVALID" });
  });

  it("completes pairing, creates a device, and stores the pairing event in the workspace hub", async () => {
    const createResponse = await SELF.fetch("http://example.com/api/pairing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: "Sanatan Chrome" }),
    });
    const created = await createResponse.json<PairingSessionCreateResponse>();

    const completeResponse = await SELF.fetch("http://example.com/api/pairing/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: created.workspaceId,
        pairingSessionId: created.pairingSessionId,
        pairingToken: created.pairingToken,
        device: {
          platform: "android",
          deviceName: "Pixel 8",
          appVersion: "1.0.0",
        },
      }),
    });

    expect(completeResponse.status).toBe(200);

    const completed = await completeResponse.json<PairingCompleteResponse>();
    expect(completed.workspaceId).toBe(created.workspaceId);
    expect(completed.deviceId).toMatch(/^dev_/);
    expect(completed.deviceToken).toMatch(/^devtok_/);

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, created.workspaceId),
    });
    const pairingSession = await db.query.pairingSessions.findFirst({
      where: eq(pairingSessions.id, created.pairingSessionId),
    });
    const device = await db.query.devices.findFirst({
      where: eq(devices.id, completed.deviceId),
    });

    expect(workspace?.activeDeviceId).toBe(completed.deviceId);
    expect(pairingSession?.status).toBe("paired");
    expect(pairingSession?.deviceId).toBe(completed.deviceId);
    expect(device?.deviceName).toBe("Pixel 8");

    const durableObjectId = env.WORKSPACE_HUB.idFromName(created.workspaceId);
    const stub = env.WORKSPACE_HUB.get(durableObjectId);

    const storedEvent = await runInDurableObject(stub, (instance: WorkspaceHub, state) => {
      void instance;
      return state.storage.get("lastPairingUpdatedEvent");
    });

    expect(storedEvent).toEqual({
      type: "pairing.updated",
      workspaceId: created.workspaceId,
      pairingSessionId: created.pairingSessionId,
      status: "paired",
      device: {
        id: completed.deviceId,
        deviceName: "Pixel 8",
      },
    });
  });
});
