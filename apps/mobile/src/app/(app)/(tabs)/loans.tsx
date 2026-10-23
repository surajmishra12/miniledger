/**
 * S05 Loans: every loan, searchable and filterable, grouped by urgency under the default sort
 * (design.md S05). This is the brief's "loan list with overdue highlighted".
 */
import type { LoanDto } from '@miniledger/shared';
import { router, useLocalSearchParams, useScrollToTop } from 'expo-router';
import {
  ArrowUpDown,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ConnectingNotice } from '@/components/ConnectingNotice';
import { EmptyState } from '@/components/EmptyState';
import { FilterChips } from '@/components/FilterChips';
import { InlineNotice } from '@/components/InlineNotice';
import { LoanRow } from '@/components/LoanRow';
import { RadioRow } from '@/components/RadioRow';
import { SearchField } from '@/components/SearchField';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SkeletonList } from '@/components/Skeleton';
import { Divider } from '@/components/Surface';
import { useAddSheet } from '@/features/ledger/AddSheet';
import { useLoanList, useSummary, type LoanFilters } from '@/features/ledger/api';
import { EmptyLedgerIllustration } from '@/features/ledger/illustrations';
import {
  buildLoanItems,
  filterSummary,
  type ListItem,
  type LoanSection,
} from '@/features/ledger/sections';
import { ApiError } from '@/lib/api-client';
import { useDebounced } from '@/lib/hooks';
import { durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space, type ColorTokens } from '@/theme/tokens';

type Direction = 'ALL' | 'LENT' | 'BORROWED';
type Status = 'all' | 'outstanding' | 'overdue' | 'repaid';
type Sort = LoanFilters['sort'];

const SORTS: { value: Sort; label: string }[] = [
  { value: 'attention', label: 'Needs attention' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'recent', label: 'Recent activity' },
];

const SECTIONS: Record<
  LoanSection,
  { title: string; icon?: LucideIcon; color: keyof ColorTokens }
> = {
  overdue: { title: 'Overdue', icon: CircleAlert, color: 'dangerText' },
  soon: { title: 'Due soon', icon: CalendarClock, color: 'warningText' },
  upcoming: { title: 'Upcoming', color: 'textSecondary' },
  repaid: { title: 'Repaid', icon: CheckCheck, color: 'textSecondary' },
};

const openLoan = (loan: LoanDto) => router.push(`/loans/${loan.id}`);

type Row = { kind: 'title' } | { kind: 'filters' } | { kind: 'state' } | ListItem<LoanDto>;

const isDirection = (v: unknown): v is Direction => v === 'ALL' || v === 'LENT' || v === 'BORROWED';
const isStatus = (v: unknown): v is Status =>
  v === 'all' || v === 'outstanding' || v === 'overdue' || v === 'repaid';

/** Dims rows while a new filter loads, then cross-fades them in (design.md §8.1). */
function Fade({ dim, children }: { dim: SharedValue<number>; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: dim.get() }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function LoansScreen() {
  const { colors, reduceMotion } = useTheme();
  const addSheet = useAddSheet();
  const params = useLocalSearchParams<{ direction?: string; status?: string; f?: string }>();
  const list = useRef<FlatList<Row>>(null);
  useScrollToTop(list);

  const [direction, setDirection] = useState<Direction>('ALL');
  const [status, setStatus] = useState<Status>('all');
  const [sort, setSort] = useState<Sort>('attention');
  const [search, setSearch] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const debouncedSearch = useDebounced(search.trim());

  // Filters handed over from Home tiles and "See all" (design.md §5.1): applied once per
  // hand-over nonce, during render, so the first frame already shows the filtered list.
  const [appliedHandOver, setAppliedHandOver] = useState<string | undefined>(undefined);
  if (params.f && params.f !== appliedHandOver) {
    setAppliedHandOver(params.f);
    setDirection(isDirection(params.direction) ? params.direction : 'ALL');
    setStatus(isStatus(params.status) ? params.status : 'all');
    setSearch('');
    setSort('attention');
  }
  useEffect(() => {
    if (params.f) list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [params.f]);

  const filters: LoanFilters = {
    sort,
    ...(direction !== 'ALL' ? { direction } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };
  const narrowed = filterSummary(filters);

  const summary = useSummary();
  const loans = useLoanList(filters);

  const staleCursor = loans.error instanceof ApiError && loans.error.code === 'INVALID_CURSOR';
  const { refetch } = loans;
  useEffect(() => {
    if (staleCursor) void refetch();
  }, [staleCursor, refetch]);

  const dim = useSharedValue(1);
  useEffect(() => {
    dim.set(
      withTiming(loans.isPlaceholderData ? 0.45 : 1, {
        duration: reduceMotion ? 0 : durations.list,
      }),
    );
  }, [loans.isPlaceholderData, reduceMotion, dim]);

  const loanItems = useMemo(() => {
    const seen = new Set<string>();
    const out: LoanDto[] = [];
    for (const page of loans.data?.pages ?? []) {
      for (const loan of page.items) {
        if (!seen.has(loan.id)) {
          seen.add(loan.id);
          out.push(loan);
        }
      }
    }
    return out;
  }, [loans.data]);

  const noLoansAtAll =
    !!summary.data && summary.data.totalLent === 0 && summary.data.totalBorrowed === 0;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [{ kind: 'title' }, { kind: 'filters' }];
    if (loanItems.length === 0) out.push({ kind: 'state' });
    out.push(...buildLoanItems(loanItems, sort === 'attention'));
    return out;
  }, [loanItems, sort]);

  const clearFilters = () => {
    setDirection('ALL');
    setStatus('all');
    setSearch('');
  };

  const filtersBlock = (
    <View
      style={[
        styles.filters,
        { backgroundColor: colors.canvas, borderBottomColor: colors.outline },
      ]}
    >
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name"
        accessibilityLabel="Search loans by name"
      />
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
      {narrowed ? (
        <View style={styles.narrowed}>
          <AppText variant="secondary" color="textSecondary" numberOfLines={1} style={styles.flex}>
            {narrowed}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
            hitSlop={10}
            onPress={clearFilters}
          >
            <AppText variant="button" color="brandPrimary">
              Clear
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const state = loans.isPending ? (
    <SkeletonList />
  ) : loans.isError && !staleCursor ? (
    <InlineNotice
      tone="offline"
      message="Couldn't load your loans."
      actionLabel="Retry"
      onAction={() => void loans.refetch()}
    />
  ) : noLoansAtAll && !narrowed ? (
    <EmptyState
      illustration={<EmptyLedgerIllustration />}
      title="A clearer way to keep track."
      body="Record money you've lent or borrowed."
      actionLabel="Add your first loan"
      actionVariant="secondary"
      onAction={addSheet.open}
    />
  ) : (
    <EmptyState
      title="No matching loans"
      body="Try another name or filter."
      actionLabel="Clear filters"
      actionVariant="secondary"
      onAction={clearFilters}
    />
  );

  const renderItem = ({ item }: { item: Row }) => {
    switch (item.kind) {
      case 'title':
        return (
          <View style={styles.titleRow}>
            <AppText variant="title" accessibilityRole="header">
              Loans
            </AppText>
            <Button
              variant="ghost"
              compact
              icon={ArrowUpDown}
              label={SORTS.find((s) => s.value === sort)?.label ?? 'Sort'}
              accessibilityHint="Changes the sort order"
              onPress={() => setSortOpen(true)}
            />
          </View>
        );
      case 'filters':
        return filtersBlock;
      case 'state':
        return <View style={styles.state}>{state}</View>;
      case 'section': {
        const s = SECTIONS[item.section];
        return <SectionHeader variant="overline" title={s.title} icon={s.icon} color={s.color} />;
      }
      case 'loan':
        return (
          <Fade dim={dim}>
            <View
              style={[
                styles.rowWrap,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outline,
                  borderTopWidth: item.first ? 1 : 0,
                  borderTopLeftRadius: item.first ? radius.lg : 0,
                  borderTopRightRadius: item.first ? radius.lg : 0,
                  borderBottomWidth: item.last ? 1 : 0,
                  borderBottomLeftRadius: item.last ? radius.lg : 0,
                  borderBottomRightRadius: item.last ? radius.lg : 0,
                  marginTop: item.first && sort !== 'attention' ? space.s3 : 0,
                },
              ]}
            >
              <LoanRow loan={item.loan} onPress={openLoan} />
              {item.last ? null : <Divider inset={68} />}
            </View>
          </Fade>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ConnectingNotice />
      <FlatList
        ref={list}
        data={rows}
        keyExtractor={(row) =>
          row.kind === 'loan' ? row.loan.id : row.kind === 'section' ? `s-${row.section}` : row.kind
        }
        renderItem={renderItem}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (loans.hasNextPage && !loans.isFetchingNextPage && !loans.isError) {
            void loans.fetchNextPage();
          }
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            {loans.isFetchingNextPage ? (
              <ActivityIndicator color={colors.brandPrimary} />
            ) : loans.isFetchNextPageError ? (
              <Button
                variant="ghost"
                compact
                label="Couldn't load more. Retry"
                onPress={() => void loans.fetchNextPage()}
              />
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={loans.isRefetching && !loans.isFetchingNextPage && !loans.isPlaceholderData}
            onRefresh={() => {
              void loans.refetch();
              void summary.refetch();
            }}
            colors={[colors.brandPrimary]}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerStyle={styles.content}
      />

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
  flex: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingBottom: space.s10 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  filters: {
    gap: space.s3,
    paddingTop: space.s2,
    paddingBottom: space.s3,
    marginHorizontal: -space.s5,
    paddingHorizontal: space.s5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  narrowed: { flexDirection: 'row', alignItems: 'center', gap: space.s3, minHeight: 24 },
  rowWrap: { borderLeftWidth: 1, borderRightWidth: 1, overflow: 'hidden' },
  state: { marginTop: space.s2 },
  footer: { minHeight: space.s10, alignItems: 'center', justifyContent: 'center' },
});
