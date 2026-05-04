export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

export function toWorkspaceWebSocketUrl(apiBaseUrl: string, workspaceId: string, webSessionToken: string) {
  const baseUrl = new URL(apiBaseUrl);
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = `/api/workspaces/${workspaceId}/ws`;
  baseUrl.search = new URLSearchParams({ token: webSessionToken }).toString();
  return baseUrl.toString();
}
