import { formatPaise } from '@miniledger/shared';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { heroGradient, radius, space } from '@/theme/tokens';

import { AnimatedAmount } from './AnimatedAmount';
import { AppText } from './AppText';
import { Tappable } from './Tappable';

type Props = {
  outstandingLentPaise: number;
  peopleOwingYou: number;
  countUp?: boolean;
  onPress?: () => void;
};

/**
 * The one hero card (design.md S04 item 2): `heroSurface` with subtle tonal depth and the S2
 * shadow in light mode; no decoration.
 */
export function SummaryHero({ outstandingLentPaise, peopleOwingYou, countUp, onPress }: Props) {
  const { colors, scheme } = useTheme();
  const context =
    outstandingLentPaise === 0
      ? 'Nothing owed to you right now'
      : `from ${peopleOwingYou} ${peopleOwingYou === 1 ? 'person' : 'people'}`;
  return (
    <Tappable
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`You are owed ${formatPaise(outstandingLentPaise)}, ${context}`}
      accessibilityHint={onPress ? 'Shows the loans people still owe you' : undefined}
      disabled={!onPress}
      onPress={onPress}
      shadow="s2"
      scaleTo={0.985}
      style={[
        styles.card,
        { backgroundColor: colors.heroSurface, backgroundImage: heroGradient[scheme] },
      ]}
    >
      <View style={styles.top}>
        <AppText variant="overline" color="onHeroMuted">
          YOU ARE OWED
        </AppText>
        {onPress ? <ChevronRight size={20} color={colors.onHeroMuted} strokeWidth={1.75} /> : null}
      </View>
      <AnimatedAmount
        paise={outstandingLentPaise}
        countUp={countUp}
        variant="hero"
        color="onHero"
        numberOfLines={1}
        adjustsFontSizeToFit
      />
      <AppText variant="secondary" color="onHeroMuted">
        {context}
      </AppText>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: space.s6, gap: space.s1, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
