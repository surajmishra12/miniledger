import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { typography, type ColorTokens } from '@/theme/tokens';

export type TextVariant = keyof typeof typography;

type Props = TextProps & {
  variant?: TextVariant;
  color?: keyof ColorTokens;
  /** Tabular figures for amounts (design.md §7.3). */
  tabular?: boolean;
  align?: 'left' | 'center' | 'right';
};

export function AppText({
  variant = 'body',
  color = 'textPrimary',
  tabular,
  align,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const token = typography[variant];
  const family = theme.font(token.fontWeight);
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
          fontWeight: family ? undefined : token.fontWeight,
          textAlign: align,
        },
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
