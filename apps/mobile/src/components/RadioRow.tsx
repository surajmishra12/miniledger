import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

/** A selectable row with a radio indicator (sort sheet, appearance selector). */
export function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      <View
        style={[
          styles.outer,
          { borderColor: selected ? colors.brandPrimary : colors.outlineStrong },
        ]}
      >
        {selected ? (
          <View style={[styles.inner, { backgroundColor: colors.brandPrimary }]} />
        ) : null}
      </View>
      <AppText>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH_TARGET + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    borderRadius: radius.md,
    paddingHorizontal: space.s2,
  },
  outer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { width: 10, height: 10, borderRadius: 5 },
});
