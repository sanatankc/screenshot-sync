export type PairingQrPayload = {
  type: "screenshot-sync-pairing";
  serverUrl: string;
  workspaceId: string;
  pairingSessionId: string;
  pairingToken: string;
};

export type PairingSessionCreateRequest = {
  clientName?: string;
};

export type PairingSessionCreateResponse = {
  workspaceId: string;
  pairingSessionId: string;
  pairingToken: string;
  webSessionToken: string;
  expiresAt: string;
  qrPayload: PairingQrPayload;
};

export type PairingCompleteRequest = {
  workspaceId: string;
  pairingSessionId: string;
  pairingToken: string;
  device: {
    platform: "android";
    deviceName: string;
    appVersion: string;
  };
};

export type PairingCompleteResponse = {
  workspaceId: string;
  deviceId: string;
  deviceToken: string;
};

export type PairingSessionStatus = "pending" | "paired" | "expired" | "cancelled";
