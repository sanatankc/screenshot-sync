export type PairingQrPayload = {
  type: "screenshot-sync-pairing";
  pairingSessionId: string;
  pairingToken: string;
};

export type PairingSessionCreateRequest = {
  clientName?: string;
};

export type PairingSessionCreateResponse = {
  pairingSessionId: string;
  pairingToken: string;
  webSessionToken: string;
  expiresAt: string;
  qrPayload: PairingQrPayload;
};

export type PairingCompleteRequest = {
  pairingSessionId: string;
  pairingToken: string;
  device: {
    deviceIdentity: string;
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

export type ViewerSessionRestoreResponse = {
  viewerSessionId: string;
  workspaceId: string;
  clientName: string | null;
};

export type PairingSessionStatus = "pending" | "paired" | "expired" | "cancelled";
