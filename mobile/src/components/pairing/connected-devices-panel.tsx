import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PairedDeviceSession } from '../../pairing/sessionStore';
import { zenTheme } from '../../theme/zen';

const monoFamily = Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined });

type ConnectedDevicesPanelProps = {
  session: PairedDeviceSession;
  onScanNewQr: () => void;
  onDisconnect: () => void;
};

export function ConnectedDevicesPanel({ session, onScanNewQr, onDisconnect }: ConnectedDevicesPanelProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.listRegion}>
        <View style={styles.deviceRow}>
          <View style={styles.deviceTextBlock}>
            <Text style={styles.deviceName}>{session.clientName?.trim() || 'Unnamed viewer'}</Text>
          </View>

          <View style={styles.deviceActions}>
            <View style={styles.liveDot} />
            <Pressable style={styles.disconnectButton} onPress={onDisconnect}>
              <Text style={styles.disconnectButtonText}>disconnect</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable style={styles.scanButton} onPress={onScanNewQr}>
        <Text style={styles.scanButtonText}>Scan New QR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 20,
  },
  listRegion: {
    gap: 14,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: zenTheme.border,
    backgroundColor: zenTheme.backgroundSoft,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  deviceTextBlock: {
    flex: 1,
    gap: 4,
  },
  deviceName: {
    color: zenTheme.foreground,
    fontSize: 17,
    fontWeight: '600',
  },
  deviceMeta: {
    color: zenTheme.muted,
    fontSize: 11,
    fontFamily: monoFamily,
  },
  deviceActions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: zenTheme.foreground,
    backgroundColor: zenTheme.success,
  },
  disconnectButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: zenTheme.border,
    backgroundColor: zenTheme.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  disconnectButtonText: {
    color: zenTheme.foreground,
    fontSize: 12,
    fontWeight: '500',
  },
  scanButton: {
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
    fontSize: 18,
    fontWeight: '600',
  },
  metaStrip: {
    gap: 4,
    alignItems: 'center',
  },
  metaText: {
    color: zenTheme.foreground,
    fontSize: 11,
    fontFamily: monoFamily,
  },
  metaTextMuted: {
    color: zenTheme.mutedSoft,
    fontSize: 10,
    fontFamily: monoFamily,
  },
});
