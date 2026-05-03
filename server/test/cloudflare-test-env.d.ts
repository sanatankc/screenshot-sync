import type { Env } from "@server/lib/env";

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}
