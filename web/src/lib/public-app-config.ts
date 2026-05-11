import {
  APP_NAME,
  buildAndroidApkDownloadUrl,
  buildOpenUrlBase,
  DEFAULT_APP_WEB_ORIGIN,
  type PublicAppConfig,
  trimTrailingSlash,
} from "@screenshot-sync/contracts";

function getConfiguredWebOrigin() {
  const configuredOrigin = import.meta.env.VITE_APP_WEB_ORIGIN;

  if (configuredOrigin) {
    return trimTrailingSlash(configuredOrigin);
  }

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
};
