# Captr Public App Config

These values define the stable public-facing URLs that should be shared across web, mobile, and server.

## Values

- `APP_WEB_ORIGIN`
  - Canonical web origin for Captr
  - example: `https://capture-shot.vercel.app`

- `APP_OPEN_URL_BASE`
  - Stable install-or-pair entrypoint
  - example: `https://capture-shot.vercel.app/open`

- `ANDROID_APK_DOWNLOAD_URL`
  - Stable Android install URL
  - example: `https://capture-shot.vercel.app/download/android/latest`

- `GITHUB_OWNER`
  - GitHub owner for versioned Android release assets
  - example: `sanatankc`

- `GITHUB_REPO`
  - GitHub repository for versioned Android release assets
  - example: `screenshot-sync`

- `ANDROID_RELEASE_TAG_PREFIX`
  - Tag prefix for Android releases
  - example: `captr-android-v`

- `ANDROID_APK_ASSET_PREFIX`
  - APK filename prefix for GitHub Release assets
  - example: `Captr-`

## Web env

Set in Vercel / local web env as:

- `VITE_API_BASE_URL`
- `VITE_APP_WEB_ORIGIN`
- `VITE_APP_OPEN_URL_BASE`
- `VITE_ANDROID_APK_DOWNLOAD_URL`
- `VITE_GITHUB_OWNER`
- `VITE_GITHUB_REPO`
- `VITE_ANDROID_RELEASE_TAG_PREFIX`
- `VITE_ANDROID_APK_ASSET_PREFIX`

## Mobile env

Set in Expo env as:

- `EXPO_PUBLIC_SERVER_URL`
- `EXPO_PUBLIC_APP_WEB_ORIGIN`
- `EXPO_PUBLIC_APP_OPEN_URL_BASE`
- `EXPO_PUBLIC_ANDROID_APK_DOWNLOAD_URL`
- `EXPO_PUBLIC_GITHUB_OWNER`
- `EXPO_PUBLIC_GITHUB_REPO`
- `EXPO_PUBLIC_ANDROID_RELEASE_TAG_PREFIX`
- `EXPO_PUBLIC_ANDROID_APK_ASSET_PREFIX`

## Server env

Set in Wrangler vars as:

- `APP_WEB_ORIGIN`
- `APP_OPEN_URL_BASE`
- `ANDROID_APK_DOWNLOAD_URL`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `ANDROID_RELEASE_TAG_PREFIX`
- `ANDROID_APK_ASSET_PREFIX`

## Stable release URL strategy

Do not point QR codes directly at a versioned GitHub release asset URL.

Instead:

1. QR points to `APP_OPEN_URL_BASE`
2. install UI links to `ANDROID_APK_DOWNLOAD_URL`
3. that stable URL redirects to the latest GitHub Release APK asset

That gives us:

- stable QR payloads
- stable install links
- versioned APK hosting on GitHub Releases

The `/download/android/latest` route itself can be implemented later on the web app or server as a redirect to the latest release asset.

## Versioned release URL format

For a known Android app version, the exact GitHub Release asset URL can be derived from config and version:

- tag: `{ANDROID_RELEASE_TAG_PREFIX}{version}`
- asset: `{ANDROID_APK_ASSET_PREFIX}{version}.apk`

Example:

- version: `0.0.1-alpha.1`
- tag: `captr-android-v0.0.1-alpha.1`
- asset: `Captr-0.0.1-alpha.1.apk`
- URL:
  - `https://github.com/sanatankc/screenshot-sync/releases/download/captr-android-v0.0.1-alpha.1/Captr-0.0.1-alpha.1.apk`

That means we do not need to hardcode a new full APK URL in config for every release.
