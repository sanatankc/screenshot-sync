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
  it("broadcasts pairing and screenshot events to subscribed viewers", async () => {
    const pairingSessionResponse = await SELF.fetch("http://example.com/api/pairing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientName: "Sanatan Chrome" }),
    });
    const pairingSession = await pairingSessionResponse.json<PairingSessionCreateResponse>();

    const wsResponse = await SELF.fetch(`http://example.com/api/workspaces/${pairingSession.workspaceId}/ws?token=${pairingSession.webSessionToken}`, {
      headers: {
        Upgrade: "websocket",
      },
    });

    expect(wsResponse.status).toBe(101);
    const socket = wsResponse.webSocket;
    expect(socket).toBeTruthy();
    socket!.accept();

    const pairingEventPromise = waitForMessage(socket!);

    const pairingCompleteResponse = await SELF.fetch("http://example.com/api/pairing/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: pairingSession.workspaceId,
        pairingSessionId: pairingSession.pairingSessionId,
        pairingToken: pairingSession.pairingToken,
        device: {
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
      workspaceId: pairingSession.workspaceId,
      pairingSessionId: pairingSession.pairingSessionId,
      status: "paired",
      device: {
        id: pairingComplete.deviceId,
        deviceName: "Pixel 8",
      },
    });

    const screenshotEventPromise = waitForMessage(socket!);

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
      expect(screenshotEvent.screenshot.workspaceId).toBe(pairingSession.workspaceId);
      expect(screenshotEvent.screenshot.status).toBe("pending");
    }

    socket!.close(1000, "done");
  });
});
