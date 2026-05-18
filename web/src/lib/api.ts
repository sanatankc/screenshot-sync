import type {
  PairingSessionCreateResponse,
  ScreenshotDeleteResponse,
  ScreenshotListResponse,
  ViewerSessionRestoreResponse,
  ViewerSessionUpdateResponse,
  WorkspacePresenceResponse,
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

export async function disconnectViewerSession(
  apiBaseUrl: string,
  webSessionToken: string,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/viewer/disconnect`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${webSessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("VIEWER_SESSION_DISCONNECT_FAILED");
  }
}


export async function deleteScreenshot(
  apiBaseUrl: string,
  webSessionToken: string,
  screenshotId: string,
): Promise<ScreenshotDeleteResponse> {
  const response = await fetch(`${apiBaseUrl}/api/screenshots/${screenshotId}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${webSessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("SCREENSHOT_DELETE_FAILED");
  }

  return response.json() as Promise<ScreenshotDeleteResponse>;
}


export async function listWorkspacePresence(
  apiBaseUrl: string,
  webSessionToken: string,
  workspaceId: string,
): Promise<WorkspacePresenceResponse> {
  const response = await fetch(`${apiBaseUrl}/api/workspaces/${workspaceId}/presence`, {
    headers: { authorization: `Bearer ${webSessionToken}` },
  });

  if (!response.ok) {
    throw new Error("WORKSPACE_PRESENCE_LIST_FAILED");
  }

  return response.json() as Promise<WorkspacePresenceResponse>;
}
