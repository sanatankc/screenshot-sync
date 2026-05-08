import type {
  PairingSessionCreateResponse,
  ScreenshotListResponse,
  ViewerSessionRestoreResponse,
} from "@screenshot-sync/contracts";

export async function createPairingSession(apiBaseUrl: string): Promise<PairingSessionCreateResponse> {
  const response = await fetch(`${apiBaseUrl}/api/pairing/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ clientName: "Web Viewer" }),
  });

  if (!response.ok) {
    throw new Error("PAIRING_SESSION_CREATE_FAILED");
  }

  return response.json() as Promise<PairingSessionCreateResponse>;
}

export async function restoreViewerSession(
  apiBaseUrl: string,
  webSessionToken: string,
): Promise<ViewerSessionRestoreResponse> {
  const response = await fetch(`${apiBaseUrl}/api/viewer/session`, {
    headers: {
      authorization: `Bearer ${webSessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("VIEWER_SESSION_RESTORE_FAILED");
  }

  return response.json() as Promise<ViewerSessionRestoreResponse>;
}

export async function listScreenshots(
  apiBaseUrl: string,
  webSessionToken: string,
  limit = 100,
): Promise<ScreenshotListResponse> {
  const response = await fetch(`${apiBaseUrl}/api/screenshots?limit=${limit}`, {
    headers: {
      authorization: `Bearer ${webSessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("SCREENSHOT_LIST_FAILED");
  }

  return response.json() as Promise<ScreenshotListResponse>;
}
