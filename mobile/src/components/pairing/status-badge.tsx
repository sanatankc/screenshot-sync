import { StyleSheet, Text, View } from 'react-native';
import { zenTheme } from '../../theme/zen';
import type { PairingPhase } from '../../pairing/types';

export function StatusBadge({ phase }: { phase: PairingPhase }) {
  const label = phase === 'paired' ? 'LIVE' : phase === 'pairing' ? 'SYNCING' : phase === 'error' ? 'ERROR' : phase === 'hydrating' ? 'LOADING' : 'READY';

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
