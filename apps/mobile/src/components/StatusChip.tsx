import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, space, type ColorTokens } from '@/theme/tokens';

import { AppText } from './AppText';

export type ChipKind = 'lent' | 'borrowed' | 'success' | 'warning' | 'danger';

const KINDS: Record<
  ChipKind,
  { text: keyof ColorTokens; surface: keyof ColorTokens; icon: LucideIcon }
> = {
  lent: { text: 'lentText', surface: 'lentSurface', icon: ArrowUpRight },
  borrowed: { text: 'borrowedText', surface: 'borrowedSurface', icon: ArrowDownLeft },
  success: { text: 'successText', surface: 'successSurface', icon: CheckCheck },
  warning: { text: 'warningText', surface: 'warningSurface', icon: CalendarClock },
  danger: { text: 'dangerText', surface: 'dangerSurface', icon: CircleAlert },
};

/** Text + icon + semantic tint; never color alone (design.md §2.3). */
export function StatusChip({ kind, label }: { kind: ChipKind; label: string }) {
  const { colors } = useTheme();
  const k = KINDS[kind];
  const Icon = k.icon;
  return (
    <View style={[styles.chip, { backgroundColor: colors[k.surface] }]}>
      <Icon size={14} color={colors[k.text]} strokeWidth={2} />
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
