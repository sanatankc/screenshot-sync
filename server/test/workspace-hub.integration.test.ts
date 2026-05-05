import { SELF } from "cloudflare:test";
import type {
  PairingCompleteResponse,
  PairingSessionCreateResponse,
  ScreenshotInitResponse,
  WorkspaceEvent,
} from "@screenshot-sync/contracts";
import { describe, expect, it } from "vitest";

function waitForMessage(socket: WebSocket): Promise<WorkspaceEvent> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for websocket message")), 2000);

    socket.addEventListener(
      "message",
      (event) => {
        clearTimeout(timeout);
        resolve(JSON.parse(String(event.data)) as WorkspaceEvent);
      },
      { once: true },
    );
  });
}

describe("workspace hub", () => {
  it("broadcasts pairing events on the pairing channel and screenshot events on the workspace channel", async () => {
    const pairingSessionResponse = await SELF.fetch("http://example.com/api/pairing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: "Sanatan Chrome" }),
    });
    const pairingSession = await pairingSessionResponse.json<PairingSessionCreateResponse>();

    const pairingWsResponse = await SELF.fetch(
      `http://example.com/api/pairing-sessions/${pairingSession.pairingSessionId}/ws?token=${pairingSession.webSessionToken}`,
      {
        headers: {
          Upgrade: "websocket",
        },
      },
    );

    expect(pairingWsResponse.status).toBe(101);
    const pairingSocket = pairingWsResponse.webSocket;
    expect(pairingSocket).toBeTruthy();
    pairingSocket!.accept();

    const pairingEventPromise = waitForMessage(pairingSocket!);

    const pairingCompleteResponse = await SELF.fetch("http://example.com/api/pairing/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pairingSessionId: pairingSession.pairingSessionId,
        pairingToken: pairingSession.pairingToken,
        device: {
          deviceIdentity: "device_identity_pixel_8",
          platform: "android",
          deviceName: "Pixel 8",
          appVersion: "1.0.0",
        },
      }),
    });
    const pairingComplete = await pairingCompleteResponse.json<PairingCompleteResponse>();

    const pairingEvent = await pairingEventPromise;
    expect(pairingEvent).toEqual({
      type: "pairing.updated",
      workspaceId: pairingComplete.workspaceId,
      pairingSessionId: pairingSession.pairingSessionId,
      status: "paired",
      device: {
        id: pairingComplete.deviceId,
        deviceName: "Pixel 8",
      },
    });

    pairingSocket!.close(1000, "pairing done");

    const workspaceWsResponse = await SELF.fetch(
      `http://example.com/api/workspaces/${pairingComplete.workspaceId}/ws?token=${pairingSession.webSessionToken}`,
      {
        headers: {
          Upgrade: "websocket",
        },
      },
    );

    expect(workspaceWsResponse.status).toBe(101);
    const workspaceSocket = workspaceWsResponse.webSocket;
    expect(workspaceSocket).toBeTruthy();
    workspaceSocket!.accept();

    const screenshotEventPromise = waitForMessage(workspaceSocket!);

    const initResponse = await SELF.fetch("http://example.com/api/screenshots/init", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${pairingComplete.deviceToken}`,
      },
      body: JSON.stringify({
        clientGeneratedId: "candidate-ws",
        capturedAt: "2026-05-04T00:00:00.000Z",
        detectedAt: "2026-05-04T00:00:01.000Z",
        width: 1080,
        height: 2400,
        mimeType: "image/png",
        fileSizeBytes: 2048,
      }),
    });
    const initData = await initResponse.json<ScreenshotInitResponse>();

    const screenshotEvent = await screenshotEventPromise;
    expect(screenshotEvent.type).toBe("screenshot.created");
    if (screenshotEvent.type === "screenshot.created") {
      expect(screenshotEvent.screenshot.id).toBe(initData.screenshotId);
      expect(screenshotEvent.screenshot.workspaceId).toBe(pairingComplete.workspaceId);
      expect(screenshotEvent.screenshot.status).toBe("pending");
    }

    workspaceSocket!.close(1000, "done");
  });
});
