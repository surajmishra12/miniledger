import { formatPaise } from '@miniledger/shared';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, space, type ColorTokens } from '@/theme/tokens';

import { AnimatedAmount } from './AnimatedAmount';
import { AppText } from './AppText';
import { IconBadge, TONES, type BadgeTone } from './IconBadge';
import { Tappable } from './Tappable';

type Props = {
  icon: LucideIcon;
  tone: BadgeTone;
  label: string;
  paise: number;
  context?: string | null;
  contextColor?: keyof ColorTokens;
  countUp?: boolean;
  onPress?: () => void;
  hint?: string;
};

/**
 * Figure tile: badge → label → amount → context on a subtle tint of its tone, with an oversized
 * faded glyph in the corner (design.md S04). The amount takes the tone's text colour; a neutral
 * tile (zero / settled) stays quiet.
 */
export function SummaryTile({
  icon: Icon,
  tone,
  label,
  paise,
  context,
  contextColor = 'textSecondary',
  countUp,
  onPress,
  hint,
}: Props) {
  const { colors, scheme } = useTheme();
  const t = TONES[tone];
  const neutral = tone === 'neutral';
  const tint = neutral ? 'surface' : t.bg;
  const spoken = [label, formatPaise(paise), context].filter(Boolean).join(', ');
  return (
    <Tappable
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={spoken}
      accessibilityHint={hint}
      disabled={!onPress}
      onPress={onPress}
      shadow="s1"
      style={[
        styles.tile,
        {
          backgroundColor: colors[tint],
          borderColor: neutral || scheme === 'dark' ? colors.outline : 'transparent',
        },
      ]}
    >
      <View
        style={styles.clip}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.glyph, { opacity: scheme === 'dark' ? 0.12 : 0.09 }]}>
          <Icon size={76} color={colors[neutral ? 'textTertiary' : t.fg]} strokeWidth={1.5} />
        </View>
      </View>
      <View style={styles.top}>
        <IconBadge icon={Icon} tone={tone} onTint={!neutral} />
        {onPress ? <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} /> : null}
      </View>
      <AppText variant="secondary" color="textSecondary" numberOfLines={1}>
        {label}
      </AppText>
      <AnimatedAmount
        paise={paise}
        countUp={countUp}
        variant="tileAmount"
        color={neutral ? 'textPrimary' : t.fg}
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
  clip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  glyph: { position: 'absolute', right: -14, bottom: -14, transform: [{ rotate: '-10deg' }] },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: space.s3,
  },
});
