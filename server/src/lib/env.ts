export type Env = {
  DB: D1Database;
  SCREENSHOT_ASSETS: R2Bucket;
  RETENTION_CLEANUP_QUEUE: Queue;
  WORKSPACE_HUB: DurableObjectNamespace;
  ALLOWED_ORIGINS?: string;
};
