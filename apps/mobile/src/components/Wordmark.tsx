import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';

import { AppText } from './AppText';

// Metro resolves image assets through require(); there is no ESM equivalent for bundled PNGs.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MARK = require('../../assets/brand/mark.png') as number;

/** Mark + live two-tone wordmark: "Mini" brand, "Ledger" text color (design.md §1.2). */
export function Wordmark({ size = 'small' }: { size?: 'small' | 'large' }) {
  const mark = size === 'large' ? 88 : 32;
  return (
    <View
      style={[styles.row, size === 'large' && styles.column]}
      accessibilityRole="header"
      accessibilityLabel="MiniLedger"
    >
      <Image source={MARK} style={{ width: mark, height: mark }} contentFit="contain" />
      <AppText variant={size === 'large' ? 'title' : 'section'}>
        <AppText variant={size === 'large' ? 'title' : 'section'} color="brandPrimary">
          Mini
        </AppText>
        Ledger
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  column: { flexDirection: 'column', gap: space.s3 },
});
