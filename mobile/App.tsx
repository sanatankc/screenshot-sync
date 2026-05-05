import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PairingQrPayload } from '@screenshot-sync/contracts';
import { completePairingSession, getConfiguredServerUrl, parsePairingQrPayload } from './src/pairing/api';
import { logPairingError, toPairingDebugString } from './src/pairing/logging';
import { zenTheme } from './src/theme/zen';

type PairingPhase = 'request-permission' | 'ready' | 'pairing' | 'paired' | 'error';

type PairingState = {
  phase: PairingPhase;
  message: string;
  payload: PairingQrPayload | null;
  workspaceId: string | null;
  deviceId: string | null;
};

const APP_VERSION = '1.0.0';
const DEVICE_NAME = Platform.OS === 'android' ? 'Screenshot Sync Android' : 'Screenshot Sync';

const initialState: PairingState = {
  phase: 'request-permission',
  message: 'Allow camera access to scan your pairing code.',
  payload: null,
  workspaceId: null,
  deviceId: null,
};

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [pairingState, setPairingState] = useState<PairingState>(initialState);
  const [scanLocked, setScanLocked] = useState(false);
  const [lastErrorDebug, setLastErrorDebug] = useState<string | null>(null);

  const permissionGranted = permission?.granted ?? false;

  const phase = useMemo<PairingPhase>(() => {
    if (!permission) {
      return 'request-permission';
    }

    if (!permissionGranted) {
      return 'request-permission';
    }

    return pairingState.phase === 'request-permission' ? 'ready' : pairingState.phase;
  }, [pairingState.phase, permission, permissionGranted]);

  const message = useMemo(() => {
    if (!permissionGranted) {
      return 'Allow camera access to scan your pairing code.';
    }

    if (phase === 'ready') {
      return 'Center the QR code inside the frame.';
    }

    return pairingState.message;
  }, [pairingState.message, permissionGranted, phase]);

  const handleRequestPermission = useCallback(async () => {
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

  const resetScanner = useCallback(() => {
    setScanLocked(false);
    setLastErrorDebug(null);
    setPairingState({
      phase: permissionGranted ? 'ready' : 'request-permission',
      message: permissionGranted ? 'Center the QR code inside the frame.' : initialState.message,
      payload: null,
      workspaceId: null,
      deviceId: null,
    });
  }, [permissionGranted]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (scanLocked) {
        return;
      }

      setScanLocked(true);

      try {
        const payload = parsePairingQrPayload(data);
        setPairingState({
          phase: 'pairing',
          message: 'Connecting this phone…',
          payload,
          workspaceId: payload.workspaceId,
          deviceId: null,
        });

        const response = await completePairingSession(payload, DEVICE_NAME, APP_VERSION);

        setPairingState({
          phase: 'paired',
          message: 'This phone is connected. Screenshot watching can stay in the background.',
          payload,
          workspaceId: response.workspaceId,
          deviceId: response.deviceId,
        });
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
      }
    },
    [scanLocked],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.eyebrow}>Pairing</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{phase === 'paired' ? 'LIVE' : phase === 'pairing' ? 'SYNCING' : phase === 'error' ? 'ERROR' : 'READY'}</Text>
            </View>
          </View>

          <View style={styles.cameraShell}>
            {permissionGranted && phase !== 'paired' ? (
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={phase === 'pairing' ? undefined : handleBarcodeScanned}
              >
                <View style={styles.cameraShadeTop} />
                <View style={styles.cameraMiddleRow}>
                  <View style={styles.cameraShadeSide} />
                  <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />
                  </View>
                  <View style={styles.cameraShadeSide} />
                </View>
                <View style={styles.cameraShadeBottom} />
              </CameraView>
            ) : (
              <View style={styles.placeholderPane}>
                {phase === 'pairing' ? <ActivityIndicator color={zenTheme.accent} size="large" /> : null}
                <Text style={styles.placeholderTitle}>{phase === 'paired' ? 'Connected' : 'Scanner'}</Text>
                <Text style={styles.placeholderBody}>{message}</Text>
              </View>
            )}
          </View>

          <View style={styles.footerRow}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Workspace</Text>
              <Text style={styles.metaValue}>{pairingState.workspaceId ? pairingState.workspaceId.slice(0, 8) : '--------'}</Text>
            </View>
            <Pressable style={styles.actionButton} onPress={permissionGranted ? resetScanner : handleRequestPermission}>
              <Text style={styles.actionButtonText}>{permissionGranted ? 'Scan again' : 'Allow camera'}</Text>
            </Pressable>
          </View>

          {lastErrorDebug ? (
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Debug</Text>
              <Text style={styles.debugValue}>{lastErrorDebug}</Text>
              <Text style={styles.debugHint}>server={(() => { try { return getConfiguredServerUrl(); } catch { return 'missing'; } })()}</Text>
            </View>
          ) : null}

          {pairingState.deviceId ? (
            <View style={styles.deviceRow}>
              <Text style={styles.deviceLabel}>Connected device</Text>
              <Text style={styles.deviceValue}>{pairingState.deviceId.slice(0, 12)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: zenTheme.background,
  },
  screen: {
    flex: 1,
    backgroundColor: zenTheme.background,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: zenTheme.border,
    backgroundColor: zenTheme.card,
    padding: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: zenTheme.muted,
    fontSize: 13,
    letterSpacing: 5,
    textTransform: 'uppercase',
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: zenTheme.border,
    backgroundColor: zenTheme.backgroundSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    color: zenTheme.foreground,
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  cameraShell: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: zenTheme.borderSoft,
    backgroundColor: zenTheme.cardStrong,
    aspectRatio: 1,
  },
  camera: {
    flex: 1,
  },
  cameraShadeTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cameraMiddleRow: {
    flexDirection: 'row',
    height: '52%',
  },
  cameraShadeSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cameraShadeBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scanFrame: {
    flex: 4.2,
    borderRadius: 26,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: zenTheme.accent,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderTopLeftRadius: 18,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderTopRightRadius: 18,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderBottomLeftRadius: 18,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderBottomRightRadius: 18,
  },
  placeholderPane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  placeholderTitle: {
    color: zenTheme.foreground,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: undefined }),
  },
  placeholderBody: {
    color: zenTheme.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  metaBlock: {
    flex: 1,
    gap: 4,
  },
  metaLabel: {
    color: zenTheme.muted,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: zenTheme.foreground,
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }),
  },
  actionButton: {
    borderRadius: 999,
    backgroundColor: zenTheme.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: zenTheme.accentInk,
    fontSize: 14,
    fontWeight: '600',
  },
  debugRow: {
    borderTopWidth: 1,
    borderTopColor: zenTheme.borderSoft,
    paddingTop: 16,
    gap: 6,
  },
  debugLabel: {
    color: zenTheme.muted,
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  debugValue: {
    color: zenTheme.danger,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }),
  },
  debugHint: {
    color: zenTheme.mutedSoft,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }),
  },
  deviceRow: {
    borderTopWidth: 1,
    borderTopColor: zenTheme.borderSoft,
    paddingTop: 16,
    gap: 6,
  },
  deviceLabel: {
    color: zenTheme.muted,
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  deviceValue: {
    color: zenTheme.success,
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }),
  },
});
