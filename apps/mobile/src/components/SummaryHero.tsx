import { formatPaise } from '@miniledger/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = { outstandingLentPaise: number; onPress?: () => void };

/** The single statement card (design.md S04 item 2). */
export function SummaryHero({ outstandingLentPaise, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`You are owed ${formatPaise(outstandingLentPaise)}, remaining to be received`}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, { backgroundColor: colors.heroSurface }]}
    >
      {/* Decorative binder-ring strokes echoing the logo (design.md §10.3). */}
      <View style={styles.rings} importantForAccessibility="no-hide-descendants">
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.ring, { backgroundColor: colors.onHero }]} />
        ))}
      </View>
      <View style={styles.overline}>
        <View style={[styles.dot, { backgroundColor: colors.heroAccent }]} />
        <AppText variant="overline" color="onHeroMuted">
          YOU ARE OWED
        </AppText>
      </View>
      <AppText variant="hero" color="onHero" tabular adjustsFontSizeToFit numberOfLines={1}>
        {formatPaise(outstandingLentPaise)}
      </AppText>
      <AppText variant="secondary" color="onHeroMuted">
        Remaining to be received
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    paddingVertical: space.s6,
    paddingLeft: space.s8,
    paddingRight: space.s6,
    gap: space.s2,
    overflow: 'hidden',
  },
  rings: { position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center', gap: 10 },
  ring: { width: 14, height: 5, borderRadius: 3, opacity: 0.1 },
  overline: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
