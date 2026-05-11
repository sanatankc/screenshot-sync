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

## Web env

Set in Vercel / local web env as:

- `VITE_API_BASE_URL`
- `VITE_APP_WEB_ORIGIN`
- `VITE_APP_OPEN_URL_BASE`
- `VITE_ANDROID_APK_DOWNLOAD_URL`

## Mobile env

Set in Expo env as:

- `EXPO_PUBLIC_SERVER_URL`
- `EXPO_PUBLIC_APP_WEB_ORIGIN`
- `EXPO_PUBLIC_APP_OPEN_URL_BASE`
- `EXPO_PUBLIC_ANDROID_APK_DOWNLOAD_URL`

## Server env

Set in Wrangler vars as:

- `APP_WEB_ORIGIN`
- `APP_OPEN_URL_BASE`
- `ANDROID_APK_DOWNLOAD_URL`

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
