# Releasing Captr Android via GitHub Releases

Captr Android is distributed as a signed APK attached to GitHub Releases.

## One-time setup

1. Log into Expo / EAS locally:

```bash
pnpm dlx eas-cli@latest login
```

2. Initialize the mobile app for EAS once:

```bash
cd mobile
pnpm dlx eas-cli@latest build:configure --platform android
```

This links the app to an Expo project and creates any missing local EAS project metadata.

If `build:configure` adds a project ID to your Expo config, commit that before your first real release so CI and local EAS builds both point at the same Expo project.

3. Add the GitHub repository secret:

- `EXPO_TOKEN`

Create it from your Expo account and store it in GitHub Actions secrets.

## Build profiles

`mobile/eas.json` defines:

- `preview-apk`: installable internal APK
- `production-apk`: signed installable release APK with auto-incremented Android build version

## Standard release flow

1. Create a new Android release version locally:

```bash
pnpm release:android patch
```

You can also use:

```bash
pnpm release:android minor
pnpm release:android major
pnpm release:android 1.2.3
pnpm release:android 0.0.1-alpha.1
```

This script:

- updates `mobile/package.json`
- updates `mobile/app.json`
- creates a release commit
- creates a tag like `captr-android-v1.2.3`
- supports prerelease tags like `captr-android-v0.0.1-alpha.1`

2. Push the release commit and tag:

```bash
git push
git push origin captr-android-v1.2.3
```

3. GitHub Actions will:

- run an EAS Android build using the `production-apk` profile
- resolve the finished build artifact URL
- download the generated APK as `Captr-X.Y.Z.apk`
- create or update the matching GitHub Release
- attach `Captr-1.2.3.apk`

## Manual rerun flow

If a tag already exists, you can rerun the release from GitHub Actions using:

- workflow: `Release Android APK`
- input: the existing `captr-android-vX.Y.Z` tag

## Notes

- The QR install flow should point to a stable web route on your domain, not directly to a GitHub asset URL.
- GitHub Releases hosts the APK binary; your app/open route should remain the permanent install-or-pair entrypoint.
- This flow assumes the GitHub Action has a valid `EXPO_TOKEN` and that the mobile project has already been linked to an Expo project once via `eas build:configure`.
