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

function getConfiguredWebOrigin() {
  // const configuredOrigin = import.meta.env.VITE_APP_WEB_ORIGIN;

  // if (configuredOrigin) {
  //   return trimTrailingSlash(configuredOrigin);
  // }

  if (typeof window !== "undefined" && window.location.origin) {
    return trimTrailingSlash(window.location.origin);
  }

  return DEFAULT_APP_WEB_ORIGIN;
}

const webOrigin = getConfiguredWebOrigin();

export const PUBLIC_APP_CONFIG: PublicAppConfig = {
  appName: APP_NAME,
  webOrigin,
  openUrlBase: import.meta.env.VITE_APP_OPEN_URL_BASE ?? buildOpenUrlBase(webOrigin),
  androidApkDownloadUrl:
    import.meta.env.VITE_ANDROID_APK_DOWNLOAD_URL ?? buildAndroidApkDownloadUrl(webOrigin),
  githubOwner: import.meta.env.VITE_GITHUB_OWNER ?? DEFAULT_GITHUB_OWNER,
  githubRepo: import.meta.env.VITE_GITHUB_REPO ?? DEFAULT_GITHUB_REPO,
  androidReleaseTagPrefix:
    import.meta.env.VITE_ANDROID_RELEASE_TAG_PREFIX ?? DEFAULT_ANDROID_RELEASE_TAG_PREFIX,
  androidApkAssetPrefix:
    import.meta.env.VITE_ANDROID_APK_ASSET_PREFIX ?? DEFAULT_ANDROID_APK_ASSET_PREFIX,
};
