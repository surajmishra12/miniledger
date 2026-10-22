import { Check } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              // 40dp visual chip, 48dp touch target (design.md §4).
              hitSlop={{ top: 4, bottom: 4 }}
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
              <AppText
                variant="secondary"
                weight={selected ? '600' : '400'}
                color={selected ? 'brandPrimary' : 'textSecondary'}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.s2, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    minHeight: 40,
    paddingHorizontal: space.s3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
