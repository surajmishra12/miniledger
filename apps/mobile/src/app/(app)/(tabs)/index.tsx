/**
 * S04 Home: what you're owed (hero), four tiles, and the loans that need attention
 * (design.md S04). The full list lives on the Loans tab.
 */
import { formatPaise, type LoanDto, type SummaryDto } from '@miniledger/shared';
import { router, useScrollToTop } from 'expo-router';
import { ArrowDownLeft, CalendarClock, CheckCheck, CircleAlert } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { ConnectingNotice } from '@/components/ConnectingNotice';
import { EmptyState } from '@/components/EmptyState';
import { Group } from '@/components/Group';
import { IconBadge } from '@/components/IconBadge';
import { InlineNotice } from '@/components/InlineNotice';
import { LoanRow } from '@/components/LoanRow';
import { Rise } from '@/components/Rise';
import { SectionHeader } from '@/components/SectionHeader';
import { SkeletonBlock, SkeletonList } from '@/components/Skeleton';
import { SummaryHero } from '@/components/SummaryHero';
import { SummaryTile } from '@/components/SummaryTile';
import { Wordmark } from '@/components/Wordmark';
import { useAddSheet } from '@/features/ledger/AddSheet';
import { useLoanList, useSummary } from '@/features/ledger/api';
import { EmptyLedgerIllustration } from '@/features/ledger/illustrations';
import { openLoans } from '@/features/ledger/navigation';
import { errorCopy } from '@/lib/error-copy';
import { plural, repaidShare } from '@/lib/format';
import { durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

/** The first-load stagger and count-up play once per app session (design.md §8.1). */
let introPlayed = false;

function Tiles({ summary, countUp }: { summary: SummaryDto; countUp: boolean }) {
  const overdue = summary.overdueAmount > 0;
  const owe = summary.outstandingBorrowed > 0;
  const dueSoon = summary.dueSoonLent + summary.dueSoonBorrowed;
  const share = repaidShare(summary.totalRepaid, summary.totalLent);
  return (
    <View style={styles.tiles}>
      <View style={styles.tileRow}>
        <SummaryTile
          icon={ArrowDownLeft}
          tone={owe ? 'borrowed' : 'neutral'}
          label="You owe"
          paise={summary.outstandingBorrowed}
          countUp={countUp}
          context={
            summary.overdueBorrowed > 0
              ? `${formatPaise(summary.overdueBorrowed)} overdue`
              : owe
                ? `to ${plural(summary.peopleYouOwe, 'person', 'people')}`
                : 'Nothing to pay back'
          }
          contextColor={summary.overdueBorrowed > 0 ? 'dangerText' : 'textSecondary'}
          hint="Shows loans you borrowed"
          onPress={() => openLoans({ direction: 'BORROWED', status: 'outstanding' })}
        />
        <SummaryTile
          icon={overdue ? CircleAlert : CheckCheck}
          tone={overdue ? 'danger' : 'neutral'}
          label="Overdue"
          paise={summary.overdueAmount}
          countUp={countUp}
          context={overdue ? plural(summary.overdueLoans, 'loan') : 'Nothing overdue'}
          hint="Shows overdue loans you lent"
          onPress={() => openLoans({ direction: 'LENT', status: 'overdue' })}
        />
      </View>
      <View style={styles.tileRow}>
        <SummaryTile
          icon={CalendarClock}
          tone={dueSoon > 0 ? 'warning' : 'neutral'}
          label="Due this week"
          paise={dueSoon}
          countUp={countUp}
          context={
            summary.dueSoonLoans > 0
              ? plural(summary.dueSoonLoans, 'loan')
              : 'Nothing due this week'
          }
          hint="Shows open loans, soonest due first"
          onPress={() => openLoans({ status: 'outstanding' })}
        />
        <SummaryTile
          icon={CheckCheck}
          tone={summary.totalRepaid > 0 ? 'success' : 'neutral'}
          label="Repaid to you"
          paise={summary.totalRepaid}
          countUp={countUp}
          context={share === null ? null : `${share}% of what you lent`}
        />
      </View>
    </View>
  );
}
function Attention({ items, hasOpen }: { items: LoanDto[]; hasOpen: boolean }) {
  const { colors } = useTheme();
  if (!hasOpen) {
    return (
      <Group>
        <View style={styles.caughtUp}>
          <IconBadge icon={CheckCheck} tone="success" />
          <View style={styles.flex}>
            <AppText variant="rowTitle">You&apos;re all caught up.</AppText>
            <AppText variant="secondary" color="textSecondary">
              No open loans right now.
            </AppText>
          </View>
        </View>
      </Group>
    );
  }
  return (
    <Group inset={72} style={{ borderColor: colors.outline }}>
      {items.map((loan) => (
        <LoanRow key={loan.id} loan={loan} onPress={() => router.push(`/loans/${loan.id}`)} />
      ))}
    </Group>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const addSheet = useAddSheet();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTop(scroll);

  const summary = useSummary();
  const attention = useLoanList({ status: 'outstanding', sort: 'attention' }, 5);
  const items = attention.data?.pages[0]?.items ?? [];

  const [animateIntro] = useState(() => !introPlayed);
  useEffect(() => {
    if (summary.data) introPlayed = true;
  }, [summary.data]);

  const data = summary.data;
  const noLoans = !!data && data.totalLent === 0 && data.totalBorrowed === 0;
  const hasOpen = !!data && (data.outstandingLent > 0 || data.outstandingBorrowed > 0);
  const refresh = () => {
    void summary.refetch();
    void attention.refetch();
  };

  let body: React.ReactNode;
  if (summary.isError && !data) {
    body = (
      <InlineNotice
        tone="offline"
        message={errorCopy(summary.error)}
        actionLabel="Retry"
        onAction={refresh}
      />
    );
  } else if (!data) {
    body = (
      <View style={styles.blocks} accessibilityLabel="Loading" accessibilityRole="progressbar">
        <SkeletonBlock height={200} rounded={22} />
        <View style={styles.tileRow}>
          <SkeletonBlock height={132} width="48%" rounded={16} />
          <SkeletonBlock height={132} width="48%" rounded={16} />
        </View>
        <View style={styles.tileRow}>
          <SkeletonBlock height={132} width="48%" rounded={16} />
          <SkeletonBlock height={132} width="48%" rounded={16} />
        </View>
        <SkeletonList rows={3} />
      </View>
    );
  } else if (noLoans) {
    body = (
      <EmptyState
        illustration={<EmptyLedgerIllustration />}
        title="A clearer way to keep track."
        body="Record money you've lent or borrowed."
        actionLabel="Add your first loan"
        actionVariant="secondary"
        onAction={addSheet.open}
      />
    );
  } else {
    const step = durations.stagger;
    body = (
      <View style={styles.blocks}>
        <Rise animate={animateIntro}>
          <SummaryHero
            outstandingLentPaise={data.outstandingLent}
            totalLentPaise={data.totalLent}
            totalRepaidPaise={data.totalRepaid}
            overduePaise={data.overdueAmount}
            peopleOwingYou={data.peopleOwingYou}
            countUp={animateIntro}
            onPress={() => openLoans({ direction: 'LENT', status: 'outstanding' })}
          />
        </Rise>
        <Rise animate={animateIntro} delay={step}>
          <Tiles summary={data} countUp={animateIntro} />
        </Rise>
        <Rise animate={animateIntro} delay={step * 2}>
          <SectionHeader
            title="Needs attention"
            actionLabel={hasOpen ? 'See all' : undefined}
            onAction={() => openLoans()}
          />
          {attention.isPending ? (
            <SkeletonList rows={3} />
          ) : attention.isError ? (
            <InlineNotice
              tone="offline"
              message="Couldn't load your loans."
              actionLabel="Retry"
              onAction={() => void attention.refetch()}
            />
          ) : (
            <Attention items={items} hasOpen={hasOpen && items.length > 0} />
          )}
        </Rise>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ConnectingNotice />
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching || attention.isRefetching}
            onRefresh={refresh}
            colors={[colors.brandPrimary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <View style={styles.header}>
          <Wordmark />
        </View>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingBottom: space.s10 },
  header: { minHeight: 56, justifyContent: 'center', marginBottom: space.s2 },
  blocks: { gap: space.s3 },
  tiles: { gap: space.s3 },
  tileRow: { flexDirection: 'row', gap: space.s3, flexWrap: 'wrap' },
  caughtUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s4,
    minHeight: 72,
  },
});
