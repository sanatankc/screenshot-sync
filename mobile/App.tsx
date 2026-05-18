import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { AppShell } from './src/components/layout/app-shell';
import { ConnectedDevicesPanel } from './src/components/pairing/connected-devices-panel';
import { DebugPanel } from './src/components/pairing/debug-panel';
import { ScannerPanel } from './src/components/pairing/scanner-panel';
import { StatusBadge } from './src/components/pairing/status-badge';
import { usePairingController } from './src/pairing/usePairingController';
import { zenTheme } from './src/theme/zen';
import { useUploadClient } from './src/uploads/use-upload-client';

export default function App() {
  const pairing = usePairingController();
  useUploadClient(pairing.pairedSession);

  return (
    <AppShell>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>{pairing.showConnectedState ? 'Connected devices' : 'Pairing scanner'}</Text>
          <StatusBadge phase={pairing.phase} />
        </View>

        {pairing.showConnectedState && pairing.pairedSession ? (
          <ConnectedDevicesPanel
            session={pairing.pairedSession}
            viewerPresence={pairing.viewerPresence}
            onScanNewQr={pairing.enterScannerMode}
            onDisconnect={pairing.disconnectDevice}
          />
        ) : (
          <ScannerPanel
            phase={pairing.phase}
            message={pairing.message}
            permissionGranted={pairing.permissionGranted}
            pairingState={pairing.pairingState}
            onScanAgain={pairing.enterScannerMode}
            onRequestPermission={pairing.requestCameraAccess}
            onBack={pairing.canExitScanner ? pairing.exitScannerMode : undefined}
            onBarcodeScanned={pairing.handleBarcodeScanned}
          />
        )}

        <DebugPanel debug={pairing.lastErrorDebug} />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 420,
    gap: 18,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  eyebrow: {
    color: zenTheme.muted,
    fontSize: 12,
    letterSpacing: 3.2,
    textTransform: 'uppercase',
  },
});
