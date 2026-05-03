import type { Env } from "@server/lib/env";

export class WorkspaceHub {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        object: "workspace-hub",
        storageReady: Boolean(this.state.storage),
        bindingsReady: Boolean(this.env.WORKSPACE_HUB),
      });
    }

    return Response.json(
      {
        ok: false,
        message: "Workspace websocket hub is scaffolded but not implemented yet."
      },
      { status: 501 }
    );
  }
}
