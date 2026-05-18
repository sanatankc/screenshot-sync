import type { PairingUpdatedEvent, ViewerPresenceUpdatedEvent, WorkspaceEvent } from "@screenshot-sync/contracts";
import { eq } from "drizzle-orm";
import { viewerSessions } from "@screenshot-sync/db-schema";
import { getDb } from "@server/lib/db";
import type { Env } from "@server/lib/env";

type SocketAttachment = {
  channelType?: string;
  workspaceId?: string;
  viewerSessionId?: string;
};

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

    if (url.pathname === "/presence") {
      const activeViewerSessionIds = (await this.listActiveViewerSessionIds()).sort();
      return Response.json({ activeViewerSessionIds });
    }

    if (url.pathname === "/websocket") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected websocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      this.state.acceptWebSocket(server);

      const channelType = url.searchParams.get("channelType");
      const workspaceId = url.searchParams.get("workspaceId");
      const viewerSessionId = url.searchParams.get("viewerSessionId");

      if (channelType === "workspace" && workspaceId && viewerSessionId) {
        server.serializeAttachment({ channelType, workspaceId, viewerSessionId } satisfies SocketAttachment);
        await this.markViewerConnection(workspaceId, viewerSessionId, "connected");
      } else {
        server.serializeAttachment({ channelType: channelType ?? "unknown" } satisfies SocketAttachment);
      }

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
      if (event.type === "workspace.disconnected") {
        this.closeAllSockets(4001, "workspace-disconnected");
      }
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

  async webSocketClose(webSocket: WebSocket): Promise<void> {
    const attachment = webSocket.deserializeAttachment() as SocketAttachment | null;
    if (attachment?.channelType === "workspace" && attachment.workspaceId && attachment.viewerSessionId) {
      await this.markViewerConnection(attachment.workspaceId, attachment.viewerSessionId, "disconnected");
    }
    webSocket.close();
  }

  private broadcastEvent(event: WorkspaceEvent) {
    const message = JSON.stringify(event);

    for (const socket of this.state.getWebSockets()) {
      socket.send(message);
    }
  }

  private closeAllSockets(code: number, reason: string) {
    for (const socket of this.state.getWebSockets()) {
      socket.close(code, reason);
    }
  }

  private viewerPresenceKey(viewerSessionId: string) {
    return `presence:viewer:${viewerSessionId}`;
  }

  private async listActiveViewerSessionIds() {
    const list = await this.state.storage.list<number>({ prefix: "presence:viewer:" });
    return [...list.entries()]
      .filter(([, count]) => (count ?? 0) > 0)
      .map(([key]) => key.replace("presence:viewer:", ""));
  }

  private async markViewerConnection(workspaceId: string, viewerSessionId: string, change: "connected" | "disconnected") {
    const key = this.viewerPresenceKey(viewerSessionId);
    const currentCount = (await this.state.storage.get<number>(key)) ?? 0;
    const nextCount = change === "connected" ? currentCount + 1 : Math.max(0, currentCount - 1);

    if (nextCount > 0) {
      await this.state.storage.put(key, nextCount);
    } else {
      await this.state.storage.delete(key);
    }

    if ((change === "connected" && currentCount > 0) || (change === "disconnected" && nextCount > 0)) {
      return;
    }

    const db = getDb(this.env);
    const now = new Date();
    await db.update(viewerSessions).set({ lastSeenAt: now }).where(eq(viewerSessions.id, viewerSessionId));
    const viewerSession = await db.query.viewerSessions.findFirst({ where: eq(viewerSessions.id, viewerSessionId) });
    if (!viewerSession) {
      return;
    }

    const event: ViewerPresenceUpdatedEvent = {
      type: "viewer.presence.updated",
      viewerSessionId,
      clientName: viewerSession.clientName ?? null,
      status: change === "connected" ? "online" : "offline",
      lastSeenAt: now.toISOString(),
    };

    await this.state.storage.put("lastWorkspaceEvent", event);
    this.broadcastEvent(event);
  }
}
