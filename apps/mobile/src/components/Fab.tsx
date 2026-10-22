import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

/** Extended "+ Add loan" FAB above the tab bar (design.md §5.1). */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: space.s4 + Math.max(insets.bottom - 40, 0),
          backgroundColor: pressed ? colors.brandPressed : colors.brandPrimary,
          shadowColor: colors.textPrimary,
          transform: [{ scale: pressed && !reduceMotion ? 0.98 : 1 }],
        },
      ]}
    >
      <Plus size={22} color={colors.onBrand} strokeWidth={2} />
      <AppText variant="button" color="onBrand">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: space.s5,
    minHeight: 56,
    paddingHorizontal: space.s5,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});
