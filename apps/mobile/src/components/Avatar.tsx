import { StyleSheet, View } from 'react-native';

import { initials } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';
import { radius } from '@/theme/tokens';

import { AppText } from './AppText';

/** Neutral initials circle; no photos, no random colors (design.md §7.2). */
export function Avatar({
  name,
  size = 40,
  muted = false,
}: {
  name: string;
  size?: number;
  /** Settled people and repaid loans read quieter (design.md §2.7). */
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      importantForAccessibility="no"
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.outline,
        },
      ]}
    >
      <AppText variant="rowTitle" color={muted ? 'textTertiary' : 'textSecondary'}>
        {initials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
