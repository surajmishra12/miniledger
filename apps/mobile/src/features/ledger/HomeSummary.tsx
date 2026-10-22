/**
 * S04 Home summary: hero (outstanding lent), borrowed strip and the assignment summary group
 * (total lent, total repaid, overdue amount).
 */
import { formatPaise, type SummaryDto } from '@miniledger/shared';
import { ArrowDownLeft, ChevronRight, CircleAlert } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Metric } from '@/components/Metric';
import { SummaryHero } from '@/components/SummaryHero';
import { Divider, Surface } from '@/components/Surface';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import type { LoanFilters } from './api';

type Props = {
  summary: SummaryDto;
  onFilter: (filters: Pick<LoanFilters, 'direction' | 'status'>) => void;
};

export function HomeSummary({ summary, onFilter }: Props) {
  const { colors, ripple } = useTheme();
  return (
    <View style={styles.wrap}>
      <SummaryHero
        outstandingLentPaise={summary.outstandingLent}
        onPress={() => onFilter({ direction: 'LENT', status: 'outstanding' })}
      />

      <Surface>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`You owe ${formatPaise(summary.outstandingBorrowed)}${
            summary.overdueBorrowed > 0 ? `, ${formatPaise(summary.overdueBorrowed)} overdue` : ''
          }`}
          accessibilityHint="Shows loans you borrowed"
          android_ripple={{ color: ripple }}
          onPress={() => onFilter({ direction: 'BORROWED', status: 'outstanding' })}
          style={styles.strip}
        >
          <View style={styles.stripRow}>
            <View style={styles.stripLabel}>
              <ArrowDownLeft size={20} color={colors.borrowedText} strokeWidth={1.75} />
              <AppText variant="rowTitle" color="borrowedText">
                You owe
              </AppText>
            </View>
            <View style={styles.stripLabel}>
              <AppText variant="cardAmount" tabular>
                {formatPaise(summary.outstandingBorrowed)}
              </AppText>
              <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} />
            </View>
          </View>
          {summary.overdueBorrowed > 0 ? (
            <View style={styles.stripLabel}>
              <CircleAlert size={16} color={colors.dangerText} strokeWidth={1.75} />
              <AppText variant="secondary" color="dangerText" tabular>
                {formatPaise(summary.overdueBorrowed)} of this is overdue
              </AppText>
            </View>
          ) : null}
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
  strip: { padding: space.s4, gap: space.s2 },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
  },
  stripLabel: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap' },
});
