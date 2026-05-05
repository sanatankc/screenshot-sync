import { CameraView } from 'expo-camera';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PairingPhase, PairingState } from '../../pairing/types';
import { zenTheme } from '../../theme/zen';

const monoFamily = Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined });
const serifFamily = Platform.select({ ios: 'Georgia', android: 'serif', default: undefined });

type ScannerPanelProps = {
  phase: PairingPhase;
  message: string;
  permissionGranted: boolean;
  pairingState: PairingState;
  onScanAgain: () => void;
  onRequestPermission: () => void;
  onBack?: () => void;
  onBarcodeScanned: (event: { data: string }) => void;
};

export function ScannerPanel({
  phase,
  message,
  permissionGranted,
  pairingState,
  onScanAgain,
  onRequestPermission,
  onBack,
  onBarcodeScanned,
}: ScannerPanelProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.scannerCard}>
        {permissionGranted && phase !== 'paired' && phase !== 'hydrating' ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={phase === 'pairing' ? undefined : onBarcodeScanned}
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
            {phase === 'pairing' || phase === 'hydrating' ? <ActivityIndicator color={zenTheme.accent} size="large" /> : null}
            <Text style={styles.placeholderTitle}>Scanner Page</Text>
            <Text style={styles.placeholderBody}>{message}</Text>
          </View>
        )}
      </View>

      <View style={styles.footerRegion}>
        <View style={styles.footerButtons}>
          {onBack ? (
            <Pressable style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.scanButton} onPress={permissionGranted ? onScanAgain : onRequestPermission}>
            <Text style={styles.scanButtonText}>{permissionGranted ? 'Reset Scan' : 'Allow camera'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
    gap: 22,
    flex: 1,
  },
  scannerCard: {
    height: 440,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: zenTheme.border,
    backgroundColor: zenTheme.cardStrong,
  },
  camera: { flex: 1 },
  cameraShadeTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)' },
  cameraMiddleRow: { flexDirection: 'row', height: '52%' },
  cameraShadeSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)' },
  cameraShadeBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)' },
  scanFrame: { flex: 4.2, borderRadius: 28, position: 'relative' },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: zenTheme.accent },
  cornerTopLeft: { top: 0, left: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 18 },
  cornerTopRight: { top: 0, right: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 18 },
  cornerBottomLeft: { bottom: 0, left: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 18 },
  cornerBottomRight: { bottom: 0, right: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 18 },
  placeholderPane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  placeholderTitle: {
    color: zenTheme.foreground,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: serifFamily,
  },
  placeholderBody: {
    color: zenTheme.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  footerRegion: {
    gap: 10,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  metaText: {
    color: zenTheme.muted,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: monoFamily,
  },
  backButton: {
    flex: 0.34,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: zenTheme.border,
    backgroundColor: zenTheme.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  backButtonText: {
    color: zenTheme.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: zenTheme.border,
    backgroundColor: zenTheme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  scanButtonText: {
    color: zenTheme.accentInk,
    fontSize: 17,
    fontWeight: '600',
  },
});
