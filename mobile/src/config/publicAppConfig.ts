import {
  APP_NAME,
  buildAndroidApkDownloadUrl,
  buildOpenUrlBase,
  DEFAULT_APP_WEB_ORIGIN,
  type PublicAppConfig,
  trimTrailingSlash,
} from "@screenshot-sync/contracts";

function getConfiguredWebOrigin() {
  return trimTrailingSlash(process.env.EXPO_PUBLIC_APP_WEB_ORIGIN ?? DEFAULT_APP_WEB_ORIGIN);
}

const webOrigin = getConfiguredWebOrigin();

export const PUBLIC_APP_CONFIG: PublicAppConfig = {
  appName: APP_NAME,
  webOrigin,
  openUrlBase: process.env.EXPO_PUBLIC_APP_OPEN_URL_BASE ?? buildOpenUrlBase(webOrigin),
  androidApkDownloadUrl:
    process.env.EXPO_PUBLIC_ANDROID_APK_DOWNLOAD_URL ?? buildAndroidApkDownloadUrl(webOrigin),
};
