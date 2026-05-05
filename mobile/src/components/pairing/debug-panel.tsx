import { Platform, StyleSheet, Text, View } from 'react-native';
import { getConfiguredServerUrl } from '../../pairing/api';
import { zenTheme } from '../../theme/zen';

const monoFamily = Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined });

export function DebugPanel({ debug }: { debug: string | null }) {
  if (!debug) {
    return null;
  }

  return (
    <View style={styles.debugRow}>
      <Text style={styles.debugLabel}>Debug</Text>
      <Text style={styles.debugValue}>{debug}</Text>
      <Text style={styles.debugHint}>server={(() => { try { return getConfiguredServerUrl(); } catch { return 'missing'; } })()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: monoFamily,
  },
  debugHint: {
    color: zenTheme.mutedSoft,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: monoFamily,
  },
});
