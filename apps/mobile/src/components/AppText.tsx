import { Text, type TextProps } from 'react-native';

import type { FontWeight } from '@/theme/theme-provider';
import { useTheme } from '@/theme/theme-provider';
import { typography, type ColorTokens } from '@/theme/tokens';

export type TextVariant = keyof typeof typography;

type Props = TextProps & {
  variant?: TextVariant;
  color?: keyof ColorTokens;
  /** Overrides the variant's weight (picks the matching font file). */
  weight?: FontWeight;
  /** Tabular figures for amounts (design.md §7.3). */
  tabular?: boolean;
  align?: 'left' | 'center' | 'right';
};

export function AppText({
  variant = 'body',
  color = 'textPrimary',
  weight,
  tabular,
  align,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const token = typography[variant];
  const fontWeight = weight ?? token.fontWeight;
  const family = theme.font(fontWeight);
  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: token.fontSize,
          lineHeight: token.lineHeight,
          color: theme.colors[color],
          fontFamily: family,
          // Custom families carry their own weight; only the system fallback needs fontWeight.
          fontWeight: family ? undefined : fontWeight,
          letterSpacing: token.letterSpacing,
          textAlign: align,
        },
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
