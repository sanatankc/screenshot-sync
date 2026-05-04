import type { PairingSessionCreateResponse } from "@screenshot-sync/contracts";

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
