export const APP_NAME = "Captr";

export const DEFAULT_APP_WEB_ORIGIN = "http://localhost:3001";
export const DEFAULT_APP_OPEN_PATH = "/open";
export const DEFAULT_ANDROID_APK_DOWNLOAD_PATH = "/download/android/latest";
export const DEFAULT_GITHUB_OWNER = "sanatankc";
export const DEFAULT_GITHUB_REPO = "screenshot-sync";
export const DEFAULT_ANDROID_RELEASE_TAG_PREFIX = "captr-android-v";
export const DEFAULT_ANDROID_APK_ASSET_PREFIX = "Captr-";

export type PublicAppConfig = {
  appName: string;
  webOrigin: string;
  openUrlBase: string;
  androidApkDownloadUrl: string;
  githubOwner: string;
  githubRepo: string;
  androidReleaseTagPrefix: string;
  androidApkAssetPrefix: string;
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

export function buildAndroidReleaseTag(
  version: string,
  tagPrefix = DEFAULT_ANDROID_RELEASE_TAG_PREFIX,
) {
  return `${tagPrefix}${version}`;
}

export function buildAndroidApkAssetName(
  version: string,
  assetPrefix = DEFAULT_ANDROID_APK_ASSET_PREFIX,
) {
  return `${assetPrefix}${version}.apk`;
}

export function buildGitHubReleaseAssetUrl({
  owner = DEFAULT_GITHUB_OWNER,
  repo = DEFAULT_GITHUB_REPO,
  version,
  tagPrefix = DEFAULT_ANDROID_RELEASE_TAG_PREFIX,
  assetPrefix = DEFAULT_ANDROID_APK_ASSET_PREFIX,
}: {
  owner?: string;
  repo?: string;
  version: string;
  tagPrefix?: string;
  assetPrefix?: string;
}) {
  const tag = buildAndroidReleaseTag(version, tagPrefix);
  const assetName = buildAndroidApkAssetName(version, assetPrefix);
  return `https://github.com/${owner}/${repo}/releases/download/${tag}/${assetName}`;
}

export function buildGitHubReleasesPageUrl(
  owner = DEFAULT_GITHUB_OWNER,
  repo = DEFAULT_GITHUB_REPO,
) {
  return `https://github.com/${owner}/${repo}/releases`;
}
