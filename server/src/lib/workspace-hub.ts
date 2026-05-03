import type { PairingUpdatedEvent } from "@screenshot-sync/contracts";
import type { Env } from "@server/lib/env";

export async function publishPairingUpdated(env: Env, workspaceId: string, event: PairingUpdatedEvent) {
  const stub = env.WORKSPACE_HUB.get(env.WORKSPACE_HUB.idFromName(workspaceId));

  await stub.fetch("https://workspace-hub.internal/events/pairing-updated", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(event),
  });
}
