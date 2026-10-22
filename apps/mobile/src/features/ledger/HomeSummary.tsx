/**
 * S04 Home summary: hero (outstanding lent), borrowed strip and the assignment summary group.
 */
import { formatPaise, type SummaryDto } from '@miniledger/shared';
import { ArrowDownLeft, CircleAlert } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { SummaryHero } from '@/components/SummaryHero';
import { Divider, Surface } from '@/components/Surface';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import type { LoanFilters } from './api';

type Props = {
  summary: SummaryDto;
  onFilter: (filters: Pick<LoanFilters, 'direction' | 'status'>) => void;
};

function Metric({
  label,
  value,
  onPress,
  danger,
}: {
  label: string;
  value: number;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`${label}, ${formatPaise(value)}`}
      onPress={onPress}
      disabled={!onPress}
      style={styles.metric}
    >
      <AppText variant="secondary" color={danger && value > 0 ? 'dangerText' : 'textSecondary'}>
        {label}
      </AppText>
      <AppText variant="cardAmount" tabular adjustsFontSizeToFit numberOfLines={1}>
        {formatPaise(value)}
      </AppText>
    </Pressable>
  );
}

export function HomeSummary({ summary, onFilter }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <SummaryHero
        outstandingLentPaise={summary.outstandingLent}
        onPress={() => onFilter({ direction: 'LENT', status: 'outstanding' })}
      />

      <Surface>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`You owe ${formatPaise(summary.outstandingBorrowed)}`}
          onPress={() => onFilter({ direction: 'BORROWED', status: 'outstanding' })}
          style={styles.strip}
        >
          <View style={styles.stripLabel}>
            <ArrowDownLeft size={20} color={colors.borrowedText} strokeWidth={1.75} />
            <AppText variant="rowTitle" color="borrowedText">
              You owe
            </AppText>
          </View>
          <View style={styles.stripValue}>
            <AppText variant="cardAmount" tabular>
              {formatPaise(summary.outstandingBorrowed)}
            </AppText>
            {summary.overdueBorrowed > 0 ? (
              <View style={styles.overdueLine}>
                <CircleAlert size={14} color={colors.dangerText} strokeWidth={2} />
                <AppText variant="secondary" color="dangerText" tabular>
                  {formatPaise(summary.overdueBorrowed)} overdue
                </AppText>
              </View>
            ) : null}
          </View>
        </Pressable>
      </Surface>

      <Surface>
        <View style={styles.metrics}>
          <Metric
            label="Total lent"
            value={summary.totalLent}
            onPress={() => onFilter({ direction: 'LENT' })}
          />
          <Metric label="Repaid to you" value={summary.totalRepaid} />
        </View>
        <Divider inset={0} />
        <Metric
          label="Overdue owed to you"
          value={summary.overdueAmount}
          danger
          onPress={() => onFilter({ direction: 'LENT', status: 'overdue' })}
        />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s3 },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.s4,
    gap: space.s3,
  },
  stripLabel: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  stripValue: { alignItems: 'flex-end', flexShrink: 1 },
  overdueLine: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap' },
  metric: { flexGrow: 1, flexBasis: 140, padding: space.s4, gap: space.s1 },
});
