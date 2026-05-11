import {
  APP_NAME,
  buildAndroidApkDownloadUrl,
  buildOpenUrlBase,
  DEFAULT_APP_WEB_ORIGIN,
  DEFAULT_ANDROID_APK_ASSET_PREFIX,
  DEFAULT_ANDROID_RELEASE_TAG_PREFIX,
  DEFAULT_GITHUB_OWNER,
  DEFAULT_GITHUB_REPO,
  type PublicAppConfig,
  trimTrailingSlash,
} from "@screenshot-sync/contracts";
import type { Env } from "@server/lib/env";

export function getPublicAppConfig(env: Env): PublicAppConfig {
  const webOrigin = trimTrailingSlash(env.APP_WEB_ORIGIN ?? DEFAULT_APP_WEB_ORIGIN);

  return {
    appName: APP_NAME,
    webOrigin,
    openUrlBase: env.APP_OPEN_URL_BASE ?? buildOpenUrlBase(webOrigin),
    androidApkDownloadUrl:
      env.ANDROID_APK_DOWNLOAD_URL ?? buildAndroidApkDownloadUrl(webOrigin),
    githubOwner: env.GITHUB_OWNER ?? DEFAULT_GITHUB_OWNER,
    githubRepo: env.GITHUB_REPO ?? DEFAULT_GITHUB_REPO,
    androidReleaseTagPrefix:
      env.ANDROID_RELEASE_TAG_PREFIX ?? DEFAULT_ANDROID_RELEASE_TAG_PREFIX,
    androidApkAssetPrefix:
      env.ANDROID_APK_ASSET_PREFIX ?? DEFAULT_ANDROID_APK_ASSET_PREFIX,
  };
}
