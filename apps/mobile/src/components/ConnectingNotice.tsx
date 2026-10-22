import { StyleSheet } from 'react-native';

import { useIsConnectingSlowly } from '@/lib/connectivity';
import { space } from '@/theme/tokens';

import { InlineNotice } from './InlineNotice';

/** Shown while any request has waited more than 3 s (design.md §9.1). */
export function ConnectingNotice() {
  const slow = useIsConnectingSlowly();
  if (!slow) return null;
  return (
    <InlineNotice
      style={styles.notice}
      tone="info"
      message="Connecting to MiniLedger… This can take a moment."
    />
  );
}

const styles = StyleSheet.create({
  notice: { marginHorizontal: space.s5, marginBottom: space.s2 },
});
