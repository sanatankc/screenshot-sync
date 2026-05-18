export type PairingQrPayload = {
  type: "screenshot-sync-pairing";
  pairingSessionId: string;
  pairingToken: string;
};

export type ResolvedPairingPayload = {
  payload: PairingQrPayload;
  serverUrl: string | null;
};

function isPairingQrPayload(value: unknown): value is PairingQrPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.type === "screenshot-sync-pairing" &&
    typeof candidate.pairingSessionId === "string" &&
    typeof candidate.pairingToken === "string"
  );
}

function normalizeServerUrl(serverUrl: string | null) {
  return serverUrl?.trim().replace(/\/+$/, "") || null;
}

export function buildPairingOpenUrl(
  openUrlBase: string,
  payload: PairingQrPayload,
  serverUrl?: string | null,
) {
  const url = new URL(openUrlBase);
  url.searchParams.set("pairingSessionId", payload.pairingSessionId);
  url.searchParams.set("pairingToken", payload.pairingToken);

  const normalizedServerUrl = normalizeServerUrl(serverUrl ?? null);
  if (normalizedServerUrl) {
    url.searchParams.set("serverUrl", normalizedServerUrl);
  }

  return url.toString();
}

export function buildMobilePairingDeepLink(
  appScheme: string,
  payload: PairingQrPayload,
  serverUrl?: string | null,
) {
  const url = new URL(`${appScheme}://pair`);
  url.searchParams.set("pairingSessionId", payload.pairingSessionId);
  url.searchParams.set("pairingToken", payload.pairingToken);

  const normalizedServerUrl = normalizeServerUrl(serverUrl ?? null);
  if (normalizedServerUrl) {
    url.searchParams.set("serverUrl", normalizedServerUrl);
  }

  return url.toString();
}

function parsePairingUrl(rawValue: string): ResolvedPairingPayload | null {
  let url: URL;

  try {
    url = new URL(rawValue);
  } catch {
    return null;
  }

  const pairingSessionId = url.searchParams.get("pairingSessionId");
  const pairingToken = url.searchParams.get("pairingToken");

  if (!pairingSessionId || !pairingToken) {
    return null;
  }

  return {
    payload: {
      type: "screenshot-sync-pairing",
      pairingSessionId,
      pairingToken,
    },
    serverUrl: normalizeServerUrl(url.searchParams.get("serverUrl")),
  };
}

export function parsePairingValue(rawValue: string): ResolvedPairingPayload | null {
  const fromUrl = parsePairingUrl(rawValue);
  if (fromUrl) {
    return fromUrl;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isPairingQrPayload(parsed)) {
      return null;
    }

    return {
      payload: parsed,
      serverUrl: null,
    };
  } catch {
    return null;
  }
}

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
  clientName: string | null;
};

export type ViewerSessionRestoreResponse = {
  viewerSessionId: string;
  workspaceId: string;
  clientName: string | null;
};

export type ViewerSessionUpdateRequest = {
  clientName?: string | null;
};

export type ViewerSessionUpdateResponse = {
  viewerSessionId: string;
  clientName: string | null;
};

export type PairingSessionStatus = "pending" | "paired" | "expired" | "cancelled";


export type DevicePresenceStatus = "online" | "offline";

export type ViewerPresenceRecord = {
  viewerSessionId: string;
  clientName: string | null;
  status: "online" | "offline";
  lastSeenAt: string;
};

export type DevicePresenceRecord = {
  deviceId: string;
  deviceName: string;
  appVersion: string;
  status: DevicePresenceStatus;
  lastSeenAt: string;
};

export type WorkspacePresenceResponse = {
  viewers: ViewerPresenceRecord[];
  devices: DevicePresenceRecord[];
};
