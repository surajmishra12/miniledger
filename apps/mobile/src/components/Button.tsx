import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, radius, space, type ColorTokens } from '@/theme/tokens';

import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Label while loading, e.g. "Saving…". */
  loadingLabel?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  compact?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
};

type Palette = { bg: string; pressed: string; text: keyof ColorTokens; border?: string };

function palette(variant: ButtonVariant, c: ColorTokens): Palette {
  switch (variant) {
    case 'primary':
      return { bg: c.brandPrimary, pressed: c.brandPressed, text: 'onBrand' };
    case 'secondary':
      return {
        bg: c.surface,
        pressed: c.surfaceMuted,
        text: 'textPrimary',
        border: c.outlineStrong,
      };
    case 'destructive':
      return {
        bg: c.surface,
        pressed: c.dangerSurface,
        text: 'dangerText',
        border: c.outlineStrong,
      };
    case 'ghost':
      return { bg: 'transparent', pressed: c.brandSubtle, text: 'brandPrimary' };
  }
}

/** 52dp buttons with pressed/disabled/loading states (design.md §4, §7.1, §7.3). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabled = false,
  icon: Icon,
  compact = false,
  style,
  accessibilityHint,
}: Props) {
  const { colors, reduceMotion } = useTheme();
  const p = palette(variant, colors);
  const inactive = disabled || loading;
  const textColor = inactive && variant !== 'primary' ? 'textTertiary' : p.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading && loadingLabel ? loadingLabel : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.regular,
        {
          backgroundColor: pressed ? p.pressed : p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 1 : 0,
          opacity: inactive && variant === 'primary' ? 0.55 : 1,
          transform: [{ scale: pressed && !reduceMotion ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={colors[p.text]} />
        ) : Icon ? (
          <Icon size={20} color={colors[textColor]} strokeWidth={1.75} />
        ) : null}
        <AppText variant="button" color={textColor}>
          {loading && loadingLabel ? loadingLabel : label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s5,
  },
  regular: { minHeight: 52 },
  compact: { minHeight: MIN_TOUCH_TARGET, alignSelf: 'flex-start', paddingHorizontal: space.s4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
});
