import { formatPaise } from '@miniledger/shared';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, space, type ColorTokens } from '@/theme/tokens';

import { AnimatedAmount } from './AnimatedAmount';
import { AppText } from './AppText';
import { IconBadge, type BadgeTone } from './IconBadge';
import { Tappable } from './Tappable';

type Props = {
  icon: LucideIcon;
  tone: BadgeTone;
  label: string;
  paise: number;
  context?: string | null;
  contextColor?: keyof ColorTokens;
  amountColor?: keyof ColorTokens;
  countUp?: boolean;
  onPress?: () => void;
  hint?: string;
};

/**
 * Home tile: badge → label → amount → context (design.md S04). Neutral amount unless the caller
 * marks a warning figure (overdue) with `amountColor`.
 */
export function SummaryTile({
  icon,
  tone,
  label,
  paise,
  context,
  contextColor = 'textSecondary',
  amountColor = 'textPrimary',
  countUp,
  onPress,
  hint,
}: Props) {
  const { colors } = useTheme();
  const spoken = [label, formatPaise(paise), context].filter(Boolean).join(', ');
  return (
    <Tappable
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={spoken}
      accessibilityHint={hint}
      disabled={!onPress}
      onPress={onPress}
      shadow="s1"
      style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.outline }]}
    >
      <View style={styles.top}>
        <IconBadge icon={icon} tone={tone} />
        {onPress ? <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} /> : null}
      </View>
      <AppText variant="secondary" color="textSecondary" numberOfLines={1}>
        {label}
      </AppText>
      <AnimatedAmount
        paise={paise}
        countUp={countUp}
        variant="tileAmount"
        color={amountColor}
        numberOfLines={1}
        adjustsFontSizeToFit
      />
      {context ? (
        <AppText variant="secondary" color={contextColor} numberOfLines={2}>
          {context}
        </AppText>
      ) : null}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space.s4,
    gap: 2,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: space.s3,
  },
});
