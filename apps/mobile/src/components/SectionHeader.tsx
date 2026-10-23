import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, space, type ColorTokens } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = {
  title: string;
  /** Overline style (list sections) or section title (Home blocks). */
  variant?: 'overline' | 'section';
  icon?: LucideIcon;
  color?: keyof ColorTokens;
  actionLabel?: string;
  onAction?: () => void;
};

/** Section title with an optional semantic icon and trailing text action (design.md §7). */
export function SectionHeader({
  title,
  variant = 'section',
  icon: Icon,
  color = variant === 'overline' ? 'textSecondary' : 'textPrimary',
  actionLabel,
  onAction,
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, variant === 'overline' ? styles.overline : styles.section]}>
      <View style={styles.title}>
        {Icon ? <Icon size={16} color={colors[color]} strokeWidth={2} /> : null}
        <AppText variant={variant} color={color} accessibilityRole="header">
          {variant === 'overline' ? title.toUpperCase() : title}
        </AppText>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
        >
          <AppText variant="button" color="brandPrimary">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { minHeight: MIN_TOUCH_TARGET, marginTop: space.s4 },
  overline: { minHeight: 36, paddingTop: space.s4, paddingBottom: space.s2 },
  title: { flexDirection: 'row', alignItems: 'center', gap: space.s2, flexShrink: 1 },
  action: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: space.s1 },
});
