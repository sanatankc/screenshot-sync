import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from "react-native";

export type ScreenshotCandidate = {
  id: string;
  mediaStoreId: string;
  uri: string;
  fileName: string;
  relativePath: string;
  mimeType: string;
  width: number;
  height: number;
  capturedAt: number;
  detectedAt: number;
  sequence: number;
};

export type ScreenshotDetectorStatus = {
  isWatching: boolean;
  listenerCount: number;
  seenItemCount: number;
  platform: string;
};

type NativeScreenshotDetectorModule = {
  startWatching(): Promise<ScreenshotDetectorStatus>;
  stopWatching(): Promise<ScreenshotDetectorStatus>;
  getStatus(): Promise<ScreenshotDetectorStatus>;
};

const detectorModule = NativeModules.ScreenshotDetector as NativeScreenshotDetectorModule | undefined;
const eventEmitter = detectorModule ? new NativeEventEmitter(NativeModules.ScreenshotDetector) : null;

export function isScreenshotDetectorAvailable() {
  return Boolean(detectorModule && Platform.OS === "android");
}

export async function ensureScreenshotPermission() {
  if (Platform.OS !== "android") {
    return true;
  }

  const permission =
    Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission, {
    title: "Allow screenshot access",
    message: "Screenshot Sync needs image access to detect new screenshots on your device.",
    buttonPositive: "Allow",
    buttonNegative: "Not now",
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function getScreenshotDetectorStatus(): Promise<ScreenshotDetectorStatus> {
  if (!detectorModule) {
    return {
      isWatching: false,
      listenerCount: 0,
      seenItemCount: 0,
      platform: Platform.OS,
    };
  }

  return detectorModule.getStatus();
}

export async function startScreenshotDetection() {
  if (!detectorModule) {
    throw new Error("Screenshot detector is unavailable on this platform");
  }
  return detectorModule.startWatching();
}

export async function stopScreenshotDetection() {
  if (!detectorModule) {
    throw new Error("Screenshot detector is unavailable on this platform");
  }
  return detectorModule.stopWatching();
}

export function subscribeToScreenshotDetections(listener: (candidate: ScreenshotCandidate) => void) {
  if (!eventEmitter) {
    return { remove() {} };
  }

  return eventEmitter.addListener("onScreenshotDetected", listener);
}

export function subscribeToDetectorState(listener: (status: ScreenshotDetectorStatus) => void) {
  if (!eventEmitter) {
    return { remove() {} };
  }

  return eventEmitter.addListener("onDetectorStateChanged", listener);
}
