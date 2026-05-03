import { Hono } from "hono";
import type { Env } from "@server/lib/env";
import { WorkspaceHub } from "@server/durable/workspace-hub";

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "screenshot-sync-server",
    capabilities: {
      workers: true,
      durableObjects: true,
      d1: true,
      r2: true,
      queues: true,
      sharedContractsReady: false
    }
  });
});

app.all("*", (c) => {
  return c.json(
    {
      ok: false,
      message: "Server scaffold is ready. API routes will be added in later tasks."
    },
    501
  );
});

export { WorkspaceHub };
export default app;
