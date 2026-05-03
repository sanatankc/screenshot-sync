import { drizzle } from "drizzle-orm/d1";
import * as schema from "@screenshot-sync/db-schema";
import type { Env } from "@server/lib/env";

export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}
