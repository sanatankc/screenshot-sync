import type { PairingUpdatedEvent, WorkspaceEvent } from "@screenshot-sync/contracts";
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
      const lastWorkspaceEvent = await this.state.storage.get<WorkspaceEvent>("lastWorkspaceEvent");

      return Response.json({
        ok: true,
        object: "workspace-hub",
        storageReady: Boolean(this.state.storage),
        bindingsReady: Boolean(this.env.WORKSPACE_HUB),
        lastPairingEventType: lastPairingEvent?.type ?? null,
        lastWorkspaceEventType: lastWorkspaceEvent?.type ?? null,
        socketCount: this.state.getWebSockets().length,
      });
    }

    if (url.pathname === "/websocket") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected websocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      this.state.acceptWebSocket(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    if (url.pathname === "/events" && request.method === "POST") {
      const event = (await request.json()) as WorkspaceEvent;
      if (event.type === "pairing.updated") {
        await this.state.storage.put("lastPairingUpdatedEvent", event);
      }
      await this.state.storage.put("lastWorkspaceEvent", event);
      this.broadcastEvent(event);
      return new Response(null, { status: 204 });
    }

    return Response.json(
      {
        ok: false,
        message: "Workspace websocket hub is scaffolded but not implemented yet.",
      },
      { status: 501 },
    );
  }

  webSocketMessage(_webSocket: WebSocket, _message: string | ArrayBuffer): void {}

  webSocketClose(webSocket: WebSocket): void {
    webSocket.close();
  }

  private broadcastEvent(event: WorkspaceEvent) {
    const message = JSON.stringify(event);

    for (const socket of this.state.getWebSockets()) {
      socket.send(message);
    }
  }
}
