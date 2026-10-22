import { formatPaise } from '@miniledger/shared';
import { ChevronRight, CircleAlert } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = {
  label: string;
  value: number;
  onPress?: () => void;
  /** Overdue figures: danger label + alert icon when above zero (design.md §2.3). */
  danger?: boolean;
};

/** Labelled figure; neutral amount, semantic colour only on the label (design.md §7 Metric). */
export function Metric({ label, value, onPress, danger }: Props) {
  const { colors, ripple } = useTheme();
  const alert = danger && value > 0;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`${label}, ${formatPaise(value)}`}
      accessibilityHint={onPress ? 'Shows these loans in the list' : undefined}
      onPress={onPress}
      disabled={!onPress}
      android_ripple={onPress ? { color: ripple } : undefined}
      style={styles.metric}
    >
      <View style={styles.label}>
        {alert ? <CircleAlert size={16} color={colors.dangerText} strokeWidth={1.75} /> : null}
        <AppText variant="secondary" color={alert ? 'dangerText' : 'textSecondary'}>
          {label}
        </AppText>
        {onPress ? <ChevronRight size={16} color={colors.textTertiary} strokeWidth={1.75} /> : null}
      </View>
      <AppText variant="cardAmount" tabular adjustsFontSizeToFit numberOfLines={1}>
        {formatPaise(value)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  metric: { flexGrow: 1, flexBasis: 140, padding: space.s4, gap: space.s1 },
  label: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
});
