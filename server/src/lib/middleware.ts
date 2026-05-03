import { createMiddleware } from "hono/factory";
import type { DeviceRow, ViewerSessionRow } from "@screenshot-sync/db-schema";
import { requireDevice, requireViewerSession } from "@server/lib/auth";
import type { Env } from "@server/lib/env";

export type AppVariables = {
  device: DeviceRow;
  viewerSession: ViewerSessionRow;
};

export const deviceAuth = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  try {
    const device = await requireDevice(c.env, c.req.header("authorization") ?? null);
    c.set("device", device);
    await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "DEVICE_UNAUTHORIZED";
    return c.json({ ok: false, error: message }, 401);
  }
});

export const viewerAuth = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  try {
    const viewerSession = await requireViewerSession(c.env, c.req.header("authorization") ?? null);
    c.set("viewerSession", viewerSession);
    await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "VIEWER_UNAUTHORIZED";
    return c.json({ ok: false, error: message }, 401);
  }
});
