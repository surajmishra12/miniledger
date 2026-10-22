import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
};

/** Neutral track; the active segment is a raised thumb with a brand label (design.md §7.2). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
}: Props<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              if (!selected) haptics.selection();
              onChange(option.value);
            }}
            style={[
              styles.segment,
              selected && {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.outline,
                borderWidth: 1,
              },
            ]}
          >
            <AppText
              variant="button"
              color={disabled ? 'textTertiary' : selected ? 'brandPrimary' : 'textSecondary'}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET - 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s2,
  },
});
