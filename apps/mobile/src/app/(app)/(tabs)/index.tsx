/**
 * Home = S04 summary card at the top + S05 complete loan list (design.md §5.1).
 */
import type { LoanDto } from '@miniledger/shared';
import { router } from 'expo-router';
import { ArrowUpDown, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ConnectingNotice } from '@/components/ConnectingNotice';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { FilterChips } from '@/components/FilterChips';
import { IconButton } from '@/components/IconButton';
import { InlineNotice } from '@/components/InlineNotice';
import { LoanRow } from '@/components/LoanRow';
import { RadioRow } from '@/components/RadioRow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SkeletonBlock, SkeletonList } from '@/components/Skeleton';
import { Divider } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { Wordmark } from '@/components/Wordmark';
import { EmptyLedgerIllustration } from '@/features/ledger/illustrations';
import { useLoanList, useSummary, type LoanFilters } from '@/features/ledger/api';
import { HomeSummary } from '@/features/ledger/HomeSummary';
import { ApiError } from '@/lib/api-client';
import { errorCopy } from '@/lib/error-copy';
import { useDebounced } from '@/lib/hooks';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

type Direction = 'ALL' | 'LENT' | 'BORROWED';
type Status = 'all' | 'outstanding' | 'overdue' | 'repaid';
type Sort = LoanFilters['sort'];

const SORTS: { value: Sort; label: string }[] = [
  { value: 'attention', label: 'Needs attention' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'recent', label: 'Recent activity' },
];

type Row = { kind: 'controls' } | { kind: 'loan'; loan: LoanDto };

export default function HomeScreen() {
  const { colors } = useTheme();
  const list = useRef<FlatList<Row>>(null);
  const [direction, setDirection] = useState<Direction>('ALL');
  const [status, setStatus] = useState<Status>('all');
  const [sort, setSort] = useState<Sort>('attention');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const debouncedSearch = useDebounced(search.trim());

  const filters: LoanFilters = {
    sort,
    ...(direction !== 'ALL' ? { direction } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };
  const filtered = direction !== 'ALL' || status !== 'all' || !!debouncedSearch;

  const summary = useSummary();
  const loans = useLoanList(filters);

  // A stale cursor silently reloads the list from the first page (design.md §9.4).
  const staleCursor = loans.error instanceof ApiError && loans.error.code === 'INVALID_CURSOR';
  const { refetch: refetchLoans } = loans;
  useEffect(() => {
    if (staleCursor) void refetchLoans();
  }, [staleCursor, refetchLoans]);

  const rows = useMemo<Row[]>(() => {
    const seen = new Set<string>();
    const items: Row[] = [{ kind: 'controls' }];
    for (const page of loans.data?.pages ?? []) {
      for (const loan of page.items) {
        if (!seen.has(loan.id)) {
          seen.add(loan.id);
          items.push({ kind: 'loan', loan });
        }
      }
    }
    return items;
  }, [loans.data]);

  const hasNoLoans = !filtered && loans.isSuccess && rows.length === 1;
  const clearFilters = () => {
    setDirection('ALL');
    setStatus('all');
    setSearch('');
    setSearchOpen(false);
  };
  const applyFilter = (next: Pick<LoanFilters, 'direction' | 'status'>) => {
    setDirection(next.direction ?? 'ALL');
    setStatus(next.status ?? 'all');
    list.current?.scrollToIndex({ index: 0, animated: true });
  };
  const refresh = () => {
    void summary.refetch();
    void loans.refetch();
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Wordmark />
        <IconButton
          icon={searchOpen ? X : Search}
          label={searchOpen ? 'Close search' : 'Search loans'}
          onPress={() => {
            if (searchOpen) setSearch('');
            setSearchOpen(!searchOpen);
          }}
        />
      </View>
      {summary.isError ? (
        <InlineNotice
          tone="offline"
          message={errorCopy(summary.error)}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : summary.data && !hasNoLoans ? (
        <HomeSummary summary={summary.data} onFilter={applyFilter} />
      ) : !summary.data ? (
        <View style={styles.skeleton}>
          <SkeletonBlock height={150} />
          <SkeletonBlock height={72} />
        </View>
      ) : null}
    </View>
  );

  const controls = hasNoLoans ? null : (
    <View style={[styles.controls, { backgroundColor: colors.canvas }]}>
      <View style={styles.listTitle}>
        <AppText variant="section" accessibilityRole="header">
          Loans
        </AppText>
        <Button
          variant="ghost"
          compact
          icon={ArrowUpDown}
          label="Sort"
          onPress={() => setSortOpen(true)}
        />
      </View>
      {searchOpen ? (
        <TextField
          label="Search by name"
          value={search}
          onChangeText={setSearch}
          autoFocus
          autoCapitalize="none"
          placeholder="Rahul"
          returnKeyType="search"
        />
      ) : null}
      <SegmentedControl
        label="Direction"
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'LENT', label: 'Lent' },
          { value: 'BORROWED', label: 'Borrowed' },
        ]}
      />
      <FilterChips
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'all', label: 'All' },
          { value: 'outstanding', label: 'Outstanding' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'repaid', label: 'Repaid' },
        ]}
      />
    </View>
  );

  const empty = loans.isPending ? (
    <SkeletonList />
  ) : loans.isError ? (
    <InlineNotice
      tone="offline"
      message="Couldn't load your loans."
      actionLabel="Retry"
      onAction={refresh}
    />
  ) : hasNoLoans ? (
    <EmptyState
      illustration={<EmptyLedgerIllustration />}
      title="A clearer way to keep track."
      body="Record money you've lent or borrowed."
      actionLabel="Add your first loan"
      onAction={() => router.push('/loans/new')}
    />
  ) : (
    <EmptyState
      title="No matching loans"
      body="Try another name or filter."
      actionLabel="Clear filters"
      onAction={clearFilters}
    />
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ConnectingNotice />
      <FlatList
        ref={list}
        data={rows}
        keyExtractor={(row) => (row.kind === 'controls' ? 'controls' : row.loan.id)}
        stickyHeaderIndices={hasNoLoans ? undefined : [0]}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        onScrollToIndexFailed={() => list.current?.scrollToOffset({ offset: 0, animated: true })}
        renderItem={({ item, index }) => {
          if (item.kind === 'controls') {
            return (
              <View>
                {controls}
                {rows.length === 1 ? <View style={styles.emptyWrap}>{empty}</View> : null}
              </View>
            );
          }
          const first = index === 1;
          const last = index === rows.length - 1;
          return (
            <View
              style={[
                styles.rowWrap,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outline,
                  borderTopWidth: first ? 1 : 0,
                  borderTopLeftRadius: first ? radius.lg : 0,
                  borderTopRightRadius: first ? radius.lg : 0,
                  borderBottomWidth: last ? 1 : 0,
                  borderBottomLeftRadius: last ? radius.lg : 0,
                  borderBottomRightRadius: last ? radius.lg : 0,
                },
              ]}
            >
              <LoanRow loan={item.loan} onPress={() => router.push(`/loans/${item.loan.id}`)} />
              {last ? null : <Divider />}
            </View>
          );
        }}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (loans.hasNextPage && !loans.isFetchingNextPage) void loans.fetchNextPage();
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            {loans.isFetchingNextPage ? <ActivityIndicator color={colors.brandPrimary} /> : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching && !loans.isFetchingNextPage}
            onRefresh={refresh}
            colors={[colors.brandPrimary]}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerStyle={styles.content}
      />
      <Fab label="Add loan" onPress={() => router.push('/loans/new')} />

      <BottomSheet visible={sortOpen} title="Sort loans" onClose={() => setSortOpen(false)}>
        <View accessibilityRole="radiogroup">
          {SORTS.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              selected={sort === option.value}
              onPress={() => {
                setSort(option.value);
                setSortOpen(false);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingBottom: 120 },
  header: { gap: space.s4, paddingBottom: space.s4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  skeleton: { gap: space.s3 },
  controls: { gap: space.s3, paddingVertical: space.s3 },
  listTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowWrap: { borderLeftWidth: 1, borderRightWidth: 1, overflow: 'hidden' },
  emptyWrap: { marginTop: space.s2 },
  footer: { minHeight: space.s8, alignItems: 'center', justifyContent: 'center' },
});
