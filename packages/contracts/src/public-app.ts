export const APP_NAME = "Captr";

export const DEFAULT_APP_WEB_ORIGIN = "http://localhost:3001";
export const DEFAULT_APP_OPEN_PATH = "/open";
export const DEFAULT_ANDROID_APK_DOWNLOAD_PATH = "/download/android/latest";

export type PublicAppConfig = {
  appName: string;
  webOrigin: string;
  openUrlBase: string;
  androidApkDownloadUrl: string;
};

export function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function buildOpenUrlBase(webOrigin: string) {
  return `${trimTrailingSlash(webOrigin)}${DEFAULT_APP_OPEN_PATH}`;
}

export function buildAndroidApkDownloadUrl(webOrigin: string) {
  return `${trimTrailingSlash(webOrigin)}${DEFAULT_ANDROID_APK_DOWNLOAD_PATH}`;
}
