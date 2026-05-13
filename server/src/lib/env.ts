export type Env = {
  DB: D1Database;
  SCREENSHOT_ASSETS: R2Bucket;
  RETENTION_CLEANUP_QUEUE: Queue;
  WORKSPACE_HUB: DurableObjectNamespace;
  ALLOWED_ORIGINS?: string;
  APP_WEB_ORIGIN?: string;
  APP_API_BASE_URL?: string;
  APP_OPEN_URL_BASE?: string;
  ANDROID_APK_DOWNLOAD_URL?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  ANDROID_RELEASE_TAG_PREFIX?: string;
  ANDROID_APK_ASSET_PREFIX?: string;
};
