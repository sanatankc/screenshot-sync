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

export type ReliabilityModeStatus = {
  enabled: boolean;
  serviceRunning: boolean;
  lastScanAt: number;
  platform: string;
};

type NativeScreenshotDetectorModule = {
  startWatching(): Promise<ScreenshotDetectorStatus>;
  stopWatching(): Promise<ScreenshotDetectorStatus>;
  getStatus(): Promise<ScreenshotDetectorStatus>;
  startReliabilityMode(): Promise<ReliabilityModeStatus>;
  stopReliabilityMode(): Promise<ReliabilityModeStatus>;
  getReliabilityStatus(): Promise<ReliabilityModeStatus>;
  syncPairedSession(session: {
    workspaceId: string;
    deviceId: string;
    deviceToken: string;
    serverUrl: string;
    connectedAt: string;
  }): Promise<void>;
  clearPairedSession(): Promise<void>;
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
    message: "Capture needs image access to detect new screenshots on your device.",
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

export async function getReliabilityModeStatus(): Promise<ReliabilityModeStatus> {
  if (!detectorModule) {
    return {
      enabled: false,
      serviceRunning: false,
      lastScanAt: 0,
      platform: Platform.OS,
    };
  }

  return detectorModule.getReliabilityStatus();
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

export async function startReliabilityMode() {
  if (!detectorModule) {
    throw new Error("Screenshot detector is unavailable on this platform");
  }
  return detectorModule.startReliabilityMode();
}

export async function stopReliabilityMode() {
  if (!detectorModule) {
    throw new Error("Screenshot detector is unavailable on this platform");
  }
  return detectorModule.stopReliabilityMode();
}

export async function syncNativePairedSession(session: {
  workspaceId: string;
  deviceId: string;
  deviceToken: string;
  serverUrl: string;
  connectedAt: string;
}) {
  if (!detectorModule) {
    return;
  }

  return detectorModule.syncPairedSession(session);
}

export async function clearNativePairedSession() {
  if (!detectorModule) {
    return;
  }

  return detectorModule.clearPairedSession();
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
