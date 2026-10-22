import { Check } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

/** Horizontally scrolling single-select chips; selection shown by check + tint (design.md §7). */
export function FilterChips<T extends string>({ options, value, onChange, label }: Props<T>) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={label}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) haptics.selection();
              onChange(option.value);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.brandSubtle : colors.surface,
                borderColor: selected ? colors.brandPrimary : colors.outline,
              },
            ]}
          >
            {selected ? <Check size={16} color={colors.brandPrimary} strokeWidth={2} /> : null}
            <AppText variant="secondary" color={selected ? 'brandPrimary' : 'textSecondary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.s2, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    minHeight: 40,
    paddingHorizontal: space.s3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
