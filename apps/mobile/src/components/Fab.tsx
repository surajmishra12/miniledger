import { Plus } from 'lucide-react-native';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { usePressFeedback } from '@/lib/press';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Extended "+ Add loan" FAB above the tab bar (design.md §5.1); no shadow in dark (§2.6). */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, scheme, reduceMotion } = useTheme();
  const press = usePressFeedback(reduceMotion, 0.96);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.fab,
        { backgroundColor: press.pressed ? colors.brandPressed : colors.brandPrimary },
        scheme === 'light' ? [styles.shadow, { shadowColor: colors.textPrimary }] : null,
        press.scaleStyle,
      ]}
    >
      <Plus size={22} color={colors.onBrand} strokeWidth={2} />
      <AppText variant="button" color="onBrand">
        {label}
      </AppText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: space.s5,
    bottom: space.s4,
    minHeight: 56,
    paddingHorizontal: space.s5,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  shadow: {
    elevation: 3,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
