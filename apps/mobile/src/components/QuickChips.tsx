import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Chip = { key: string; label: string; accessibilityLabel?: string };

type Props = {
  chips: Chip[];
  /** The chip matching the field's current value, shown as selected. */
  selectedKey?: string | null;
  onPick: (key: string) => void;
  label: string;
};

/**
 * One-tap shortcuts under a field (due-date presets, recent people, repayment shares;
 * design.md S06, S08). Small outlined pills; the matching one takes the action tint.
 */
export function QuickChips({ chips, selectedKey, onPick, label }: Props) {
  const { colors } = useTheme();
  if (chips.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessibilityLabel={label}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => {
        const selected = chip.key === selectedKey;
        return (
          <Pressable
            key={chip.key}
            accessibilityRole="button"
            accessibilityLabel={chip.accessibilityLabel ?? chip.label}
            accessibilityState={{ selected }}
            hitSlop={{ top: 6, bottom: 6 }}
            onPress={() => {
              haptics.selection();
              onPick(chip.key);
            }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? colors.brandSubtle : colors.surface,
                borderColor: selected ? colors.brandPrimary : colors.outline,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <AppText
              variant="secondary"
              weight={selected ? '600' : '500'}
              color={selected ? 'brandPrimary' : 'textSecondary'}
              numberOfLines={1}
            >
              {chip.label}
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
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space.s3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
