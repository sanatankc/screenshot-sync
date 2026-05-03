import type { PairingUpdatedEvent } from "@screenshot-sync/contracts";
import type { Env } from "@server/lib/env";

export class WorkspaceHub {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      const lastPairingEvent = await this.state.storage.get<PairingUpdatedEvent>("lastPairingUpdatedEvent");

      return Response.json({
        ok: true,
        object: "workspace-hub",
        storageReady: Boolean(this.state.storage),
        bindingsReady: Boolean(this.env.WORKSPACE_HUB),
        lastPairingEventType: lastPairingEvent?.type ?? null,
      });
    }

    if (url.pathname === "/events/pairing-updated" && request.method === "POST") {
      const event = (await request.json()) as PairingUpdatedEvent;
      await this.state.storage.put("lastPairingUpdatedEvent", event);
      return Response.json({ ok: true });
    }

    return Response.json(
      {
        ok: false,
        message: "Workspace websocket hub is scaffolded but not implemented yet.",
      },
      { status: 501 },
    );
  }
}
