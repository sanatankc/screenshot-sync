import type {
  PairingSessionCreateResponse,
  ScreenshotListResponse,
  ViewerSessionRestoreResponse,
  ViewerSessionUpdateResponse,
} from "@screenshot-sync/contracts";

export async function createPairingSession(apiBaseUrl: string, clientName?: string): Promise<PairingSessionCreateResponse> {
  const response = await fetch(`${apiBaseUrl}/api/pairing/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ clientName: clientName?.trim() || "Web Viewer" }),
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

export async function updateViewerSessionClientName(
  apiBaseUrl: string,
  webSessionToken: string,
  clientName: string,
): Promise<ViewerSessionUpdateResponse> {
  const response = await fetch(`${apiBaseUrl}/api/viewer/session`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${webSessionToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ clientName }),
  });

  if (!response.ok) {
    throw new Error("VIEWER_SESSION_UPDATE_FAILED");
  }

  return response.json() as Promise<ViewerSessionUpdateResponse>;
}

