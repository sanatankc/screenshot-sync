# Plan: Screenshot Sync Prototype

## Summary

Build the smallest end-to-end system that proves the core loop works:

- Android app detects new screenshots in the background and queues them for upload
- Backend accepts image uploads and stores them
- Web app shows uploaded screenshots in a simple gallery

The goal of this prototype is not perfect production reliability. The goal is to prove that background detection, upload, and viewing all work together with minimal moving parts.

## Key Changes
### Android app
- Build an Expo/React Native app with a small Android native module for screenshot detection
- Detect screenshots via `MediaStore`, not screenshot callback APIs
- Add a lightweight local queue so detected screenshots can be retried if upload fails
- Run background sync using Android-friendly scheduling, with a simple first-pass background worker
- Upload screenshots to a single backend endpoint
- Show minimal in-app sync state: queued, uploading, uploaded, failed

### Upload backend
- Create one basic HTTP upload endpoint for screenshot files plus minimal metadata
- Store uploaded images on disk for the prototype
- Return a stable URL or file id for each uploaded image
- Expose one listing endpoint so the web app can fetch uploaded screenshots

### Web app
- Build a basic gallery page that fetches uploaded screenshots and renders them newest-first
- Keep UI intentionally minimal: image grid/list, timestamp, and upload status if available
- No auth, no editing, no folders, no sharing in v1

## Build Order
1. Set up repo structure for `mobile`, `server`, and `web`
2. Implement Android screenshot detection and local queue first
3. Add upload endpoint and disk storage second
4. Connect Android uploads to backend
5. Build the simple web gallery on top of the listing endpoint
6. Test the full flow: take screenshot on Android, wait for upload, confirm it appears on the web page

## Test Plan
- Screenshot taken while app is open uploads successfully
- Screenshot taken while app is backgrounded is detected and uploaded
- Failed upload stays queued and retries later
- Server stores uploaded file and returns it in the list API
- Web app shows newly uploaded screenshots without manual data fixing
- Duplicate screenshot events do not create obvious duplicate uploads if the same file is retried

## Assumptions
- This repo is empty, so we are planning a greenfield prototype
- Android is the only mobile platform in scope for now
- Prototype storage is local disk on the backend, not S3 or cloud storage
- Prototype can skip auth and account systems
- Prototype priority is basic reliable enough to demo, not Play Store readiness or production hardening
