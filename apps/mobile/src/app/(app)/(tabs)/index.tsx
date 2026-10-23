/**
 * S04 Home (design.md S04 v2): where do I stand (summary card), what do I owe (one quiet row),
 * and what needs me (attention list). Colour marks exceptions only; amounts stay neutral.
 */
import { formatPaise, type LoanDto, type SummaryDto } from '@miniledger/shared';
import { router, useScrollToTop } from 'expo-router';
import { ArrowDownLeft, CheckCheck, ChevronRight } from 'lucide-react-native';
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
import { Tappable } from '@/components/Tappable';
import { Wordmark } from '@/components/Wordmark';
import { useAddSheet } from '@/features/ledger/AddSheet';
import { useLoanList, useSummary } from '@/features/ledger/api';
import { EmptyLedgerIllustration } from '@/features/ledger/illustrations';
import { openLoans } from '@/features/ledger/navigation';
import { errorCopy } from '@/lib/error-copy';
import { plural } from '@/lib/format';
import { durations, pressScale } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

/** The first-load stagger and count-up play once per app session (design.md §8.1). */
let introPlayed = false;

const openLoan = (loan: LoanDto) => router.push(`/loans/${loan.id}`);

/** What you owe, deliberately quieter than what you'll receive. Hidden when you owe nothing. */
function YouWillPay({ summary }: { summary: SummaryDto }) {
  const { colors, shadow } = useTheme();
  const overdue = summary.overdueBorrowed > 0;
  const context = overdue
    ? `${formatPaise(summary.overdueBorrowed)} overdue`
    : `to ${plural(summary.peopleYouOwe, 'person', 'people')}`;
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`You'll pay ${formatPaise(summary.outstandingBorrowed)}, ${context}`}
      accessibilityHint="Shows loans you borrowed"
      onPress={() => openLoans({ direction: 'BORROWED', status: 'outstanding' })}
      ripple
      scaleTo={pressScale.row}
      style={[
        styles.pay,
        { backgroundColor: colors.surface, borderColor: colors.outline },
        shadow('s1'),
      ]}
    >
      <IconBadge icon={ArrowDownLeft} tone="borrowed" size={32} />
      <View style={styles.flex}>
        <AppText variant="secondary" color="textSecondary">
          You&apos;ll pay
        </AppText>
        <View style={styles.payLine}>
          <AppText variant="rowTitle" weight="700" tabular>
            {formatPaise(summary.outstandingBorrowed)}
          </AppText>
          <AppText
            variant="secondary"
            color={overdue ? 'dangerText' : 'textSecondary'}
            numberOfLines={1}
            style={styles.flex}
          >
            {context}
          </AppText>
        </View>
      </View>
      <ChevronRight size={20} color={colors.textTertiary} strokeWidth={1.75} />
    </Tappable>
  );
}

function Attention({ items, hasOpen }: { items: LoanDto[]; hasOpen: boolean }) {
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
    <Group inset={68}>
      {items.map((loan) => (
        <LoanRow key={loan.id} loan={loan} onPress={openLoan} remind />
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
        <SkeletonBlock height={232} rounded={radius.xl} />
        <SkeletonBlock height={64} rounded={radius.lg} />
        <SkeletonBlock height={24} width="45%" />
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
        {data.outstandingBorrowed > 0 ? (
          <Rise animate={animateIntro} delay={step}>
            <YouWillPay summary={data} />
          </Rise>
        ) : null}
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
  pay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
    minHeight: 64,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  payLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.s2 },
  caughtUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s4,
    minHeight: 72,
  },
});
