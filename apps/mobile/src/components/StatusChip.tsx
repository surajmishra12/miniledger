import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  CircleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, space, type ColorTokens } from '@/theme/tokens';

import { AppText } from './AppText';

export type ChipKind = 'lent' | 'borrowed' | 'success' | 'warning' | 'danger' | 'settled' | 'due';

export const CHIP_KINDS: Record<
  ChipKind,
  { text: keyof ColorTokens; surface: keyof ColorTokens; icon: LucideIcon }
> = {
  lent: { text: 'lentText', surface: 'lentSurface', icon: ArrowUpRight },
  borrowed: { text: 'borrowedText', surface: 'borrowedSurface', icon: ArrowDownLeft },
  success: { text: 'successText', surface: 'successSurface', icon: CheckCheck },
  warning: { text: 'warningText', surface: 'warningSurface', icon: CalendarClock },
  danger: { text: 'dangerText', surface: 'dangerSurface', icon: CircleAlert },
  /** Finished loans read neutral, not celebratory (design.md §2.3 v1.6). */
  settled: { text: 'textSecondary', surface: 'surfaceMuted', icon: CheckCheck },
  /** Plain countdown ("Due in 5 days") on Loan detail. */
  due: { text: 'textSecondary', surface: 'surfaceMuted', icon: CalendarDays },
};

/** Text + icon + semantic tint; never colour alone (design.md §2.3). */
export function StatusChip({ kind, label }: { kind: ChipKind; label: string }) {
  const { colors } = useTheme();
  const k = CHIP_KINDS[kind];
  const Icon = k.icon;
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.chip, { backgroundColor: colors[k.surface] }]}
    >
      <Icon size={14} color={colors[k.text]} strokeWidth={1.75} />
      <AppText variant="overline" color={k.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    paddingHorizontal: space.s2,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
});
