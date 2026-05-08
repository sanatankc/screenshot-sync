export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";
export const VIEWER_SESSION_STORAGE_KEY = "screenshot-sync.viewer-session";

export function toWorkspaceWebSocketUrl(apiBaseUrl: string, workspaceId: string, webSessionToken: string) {
  const baseUrl = new URL(apiBaseUrl);
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = `/api/workspaces/${workspaceId}/ws`;
  baseUrl.search = new URLSearchParams({ token: webSessionToken }).toString();
  return baseUrl.toString();
}

export function toPairingWebSocketUrl(apiBaseUrl: string, pairingSessionId: string, webSessionToken: string) {
  const baseUrl = new URL(apiBaseUrl);
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = `/api/pairing-sessions/${pairingSessionId}/ws`;
  baseUrl.search = new URLSearchParams({ token: webSessionToken }).toString();
  return baseUrl.toString();
}

export function toAssetUrl(apiBaseUrl: string, storageKey: string, webSessionToken: string) {
  const baseUrl = new URL(apiBaseUrl);
  baseUrl.pathname = `/api/assets/${storageKey}`;
  baseUrl.search = new URLSearchParams({ token: webSessionToken }).toString();
  return baseUrl.toString();
}
