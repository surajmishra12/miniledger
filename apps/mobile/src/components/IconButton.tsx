import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, radius, type ColorTokens } from '@/theme/tokens';

type Props = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  color?: keyof ColorTokens;
};

/** Icon-only button with a 48dp target and an accessibility label (design.md §10.1). */
export function IconButton({ icon: Icon, label, onPress, color = 'textPrimary' }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      <Icon size={24} color={colors[color]} strokeWidth={1.75} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
