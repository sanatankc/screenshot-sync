import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { completePairingSession, getConfiguredServerUrl, parsePairingQrPayload } from './api';
import { logPairingError, toPairingDebugString } from './logging';
import {
  clearPairedDeviceSession,
  loadDeviceIdentity,
  loadPairedDeviceSession,
  saveDeviceIdentity,
  savePairedDeviceSession,
  type PairedDeviceSession,
} from './sessionStore';
import { ensureAppStorage } from '../storage/bootstrap';
import { PUBLIC_APP_CONFIG } from '../config/publicAppConfig';
import type { PairingController, PairingState, PairingPhase } from './types';

const APP_VERSION = '1.0.0';
const DEVICE_NAME = `${PUBLIC_APP_CONFIG.appName} Android`;

function createDeviceIdentityValue() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `device_${globalThis.crypto.randomUUID()}`;
  }

  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

const initialState: PairingState = {
  phase: 'hydrating',
  message: 'Restoring this device…',
  payload: null,
  workspaceId: null,
  deviceId: null,
};

export function usePairingController(): PairingController {
  const [permission, requestPermission] = useCameraPermissions();
  const [pairingState, setPairingState] = useState<PairingState>(initialState);
  const [scanLocked, setScanLocked] = useState(false);
  const [lastErrorDebug, setLastErrorDebug] = useState<string | null>(null);
  const [pairedSession, setPairedSession] = useState<PairedDeviceSession | null>(null);
  const [isScannerMode, setIsScannerMode] = useState(false);

  const permissionGranted = permission?.granted ?? false;

  const beginPairing = useCallback(
    async (rawValue: string) => {
      const resolved = parsePairingQrPayload(rawValue);
      const deviceIdentity =
        (await loadDeviceIdentity()) ?? {
          value: createDeviceIdentityValue(),
          createdAt: new Date().toISOString(),
        };

      await saveDeviceIdentity(deviceIdentity);
      setPairingState({
        phase: 'pairing',
        message: 'Connecting this phone…',
        payload: resolved.payload,
        workspaceId: null,
        deviceId: null,
      });

      const response = await completePairingSession(
        resolved.payload,
        deviceIdentity.value,
        DEVICE_NAME,
        APP_VERSION,
        resolved.serverUrl,
      );

      const session: PairedDeviceSession = {
        workspaceId: response.workspaceId,
        deviceId: response.deviceId,
        deviceToken: response.deviceToken,
        serverUrl: getConfiguredServerUrl(resolved.serverUrl),
        connectedAt: new Date().toISOString(),
        clientName: response.clientName ?? null,
      };

      await savePairedDeviceSession(session);
      setPairedSession(session);
      setIsScannerMode(false);
      setLastErrorDebug(null);
      setPairingState({
        phase: 'paired',
        message: 'This phone is connected. Screenshot watching and uploading happen automatically.',
        payload: resolved.payload,
        workspaceId: response.workspaceId,
        deviceId: response.deviceId,
      });
    },
    [],
  );

  useEffect(() => {
    void (async () => {
      try {
        await ensureAppStorage();
        const restored = await loadPairedDeviceSession();

        if (restored) {
          setPairedSession(restored);
          setPairingState({
            phase: 'paired',
            message: 'This phone is connected. Screenshot watching and uploading happen automatically.',
            payload: null,
            workspaceId: restored.workspaceId,
            deviceId: restored.deviceId,
          });
          return;
        }

        setPairingState({
          phase: permissionGranted ? 'ready' : 'request-permission',
          message: permissionGranted ? 'Center the QR code inside the frame.' : 'Allow camera access to scan your pairing code.',
          payload: null,
          workspaceId: null,
          deviceId: null,
        });
      } catch (error) {
        logPairingError('hydrate-session', error);
        setLastErrorDebug(toPairingDebugString(error));
        setPairingState({
          phase: 'error',
          message: 'Could not restore device state.',
          payload: null,
          workspaceId: null,
          deviceId: null,
        });
      }
    })();
  }, [permissionGranted]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const initialUrl = await Linking.getInitialURL().catch(() => null);
      if (!mounted || !initialUrl) {
        return;
      }

      try {
        await beginPairing(initialUrl);
      } catch (error) {
        logPairingError('deep-link-pair', error, {
          initialUrl,
          configuredServerUrl: process.env.EXPO_PUBLIC_SERVER_URL ?? null,
        });
        setLastErrorDebug(toPairingDebugString(error));
      }
    })();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void (async () => {
        try {
          await beginPairing(url);
        } catch (error) {
          logPairingError('deep-link-pair', error, {
            url,
            configuredServerUrl: process.env.EXPO_PUBLIC_SERVER_URL ?? null,
          });
          setLastErrorDebug(toPairingDebugString(error));
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [beginPairing]);

  const phase = useMemo<PairingPhase>(() => {
    if (pairedSession && !isScannerMode) {
      return 'paired';
    }

    if (pairingState.phase === 'hydrating') {
      return 'hydrating';
    }

    if (!permission) {
      return 'request-permission';
    }

    if (!permissionGranted) {
      return 'request-permission';
    }

    return pairingState.phase === 'request-permission' ? 'ready' : pairingState.phase;
  }, [isScannerMode, pairedSession, pairingState.phase, permission, permissionGranted]);

  const message = useMemo(() => {
    if (phase === 'hydrating') {
      return 'Restoring this device…';
    }

    if (!permissionGranted && phase !== 'paired') {
      return 'Allow camera access to scan your pairing code.';
    }

    if (phase === 'ready') {
      return 'Center the QR code inside the frame.';
    }

    return pairingState.message;
  }, [pairingState.message, permissionGranted, phase]);

  const requestCameraAccess = useCallback(async () => {
    const result = await requestPermission();

    if (!result.granted) {
      const nextError = new Error('Camera access is required to scan a pairing code.');
      logPairingError('camera-permission', nextError);
      setLastErrorDebug('CAMERA_PERMISSION_DENIED');
      setPairingState({
        ...initialState,
        phase: 'error',
        message: 'Camera access is required to scan a pairing code.',
      });
      return;
    }

    setPairingState((current) => ({
      ...current,
      phase: 'ready',
      message: 'Center the QR code inside the frame.',
    }));
  }, [requestPermission]);

  const enterScannerMode = useCallback(() => {
    setScanLocked(false);
    setLastErrorDebug(null);
    setIsScannerMode(true);
    setPairingState({
      phase: permissionGranted ? 'ready' : 'request-permission',
      message: permissionGranted ? 'Center the QR code inside the frame.' : 'Allow camera access to scan your pairing code.',
      payload: null,
      workspaceId: null,
      deviceId: null,
    });
  }, [permissionGranted]);

  const exitScannerMode = useCallback(() => {
    if (!pairedSession) {
      return;
    }

    setIsScannerMode(false);
    setLastErrorDebug(null);
    setPairingState((current) => ({
      ...current,
      phase: 'paired',
      message: 'This phone is connected. Screenshot watching and uploading happen automatically.',
      workspaceId: pairedSession.workspaceId,
      deviceId: pairedSession.deviceId,
    }));
  }, [pairedSession]);

  const disconnectDevice = useCallback(() => {
    void clearPairedDeviceSession();
    setPairedSession(null);
    enterScannerMode();
  }, [enterScannerMode]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (scanLocked) {
        return;
      }

      setScanLocked(true);

      try {
        await beginPairing(data);
      } catch (error) {
        const nextMessage = error instanceof Error ? error.message : 'Could not read that QR code.';
        const debugString = toPairingDebugString(error);

        logPairingError('scan-complete', error, {
          configuredServerUrl: process.env.EXPO_PUBLIC_SERVER_URL ?? null,
        });
        setLastErrorDebug(debugString);
        setPairingState({
          phase: 'error',
          message: nextMessage,
          payload: null,
          workspaceId: null,
          deviceId: null,
        });
      } finally {
        setScanLocked(false);
      }
    },
    [beginPairing, scanLocked],
  );

  const showConnectedState = Boolean(pairedSession && !isScannerMode);

  return {
    phase,
    message,
    permissionGranted,
    showConnectedState,
    canExitScanner: Boolean(pairedSession),
    pairingState,
    pairedSession,
    lastErrorDebug,
    requestCameraAccess: () => {
      void requestCameraAccess();
    },
    enterScannerMode,
    exitScannerMode,
    disconnectDevice,
    handleBarcodeScanned: (event) => {
      void handleBarcodeScanned(event as BarcodeScanningResult);
    },
  };
}
