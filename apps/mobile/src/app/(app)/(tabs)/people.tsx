/**
 * S09 People: Active / Archived, search, add person; people with an open balance first
 * (design.md S09, §2.7).
 */
import { normalizeText, type PersonDto } from '@miniledger/shared';
import { router, useScrollToTop } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConnectingNotice } from '@/components/ConnectingNotice';
import { EmptyState } from '@/components/EmptyState';
import { InlineNotice } from '@/components/InlineNotice';
import { PersonRow } from '@/components/PersonRow';
import { SearchField } from '@/components/SearchField';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SkeletonList } from '@/components/Skeleton';
import { useSnackbar } from '@/components/Snackbar';
import { Divider } from '@/components/Surface';
import { usePeople } from '@/features/ledger/api';
import { EmptyPeopleIllustration } from '@/features/ledger/illustrations';
import { peopleRows, type PeopleRow as Row } from '@/features/ledger/people-rows';
import { PersonNameDialog } from '@/features/ledger/PersonNameDialog';
import { errorCopy } from '@/lib/error-copy';
import { useDebounced } from '@/lib/hooks';
import { invalidateLedger } from '@/lib/query-client';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

type Tab = 'active' | 'archived';

const openPerson = (person: PersonDto) => router.push(`/people/${person.id}`);
export default function PeopleScreen() {
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const list = useRef<ComponentRef<typeof FlatList<Row>>>(null);
  useScrollToTop(list);
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const search = useDebounced(normalizeText(query));
  const people = usePeople({
    ...(search ? { search } : {}),
    ...(tab === 'archived' ? { archived: true } : {}),
  });
  const items = useMemo(() => people.data?.items ?? [], [people.data]);
  const rows = useMemo(() => peopleRows(items, tab === 'active' && !search), [items, tab, search]);

  const empty = people.isPending ? (
    <SkeletonList />
  ) : people.isError ? (
    <InlineNotice
      tone="offline"
      message={errorCopy(people.error)}
      actionLabel="Retry"
      onAction={() => void people.refetch()}
    />
  ) : search ? (
    <EmptyState
      title="No matching people"
      actionLabel="Clear search"
      actionVariant="secondary"
      onAction={() => setQuery('')}
    />
  ) : tab === 'archived' ? (
    <EmptyState title="No archived people." />
  ) : (
    <EmptyState
      illustration={<EmptyPeopleIllustration />}
      title="Your people will appear here."
      body="Add someone you lend to or borrow from."
      actionLabel="Add person"
      actionVariant="secondary"
      onAction={() => setAdding(true)}
    />
  );

  const renderItem = ({ item }: { item: Row }) => {
    if (item.kind === 'section') {
      return <SectionHeader variant="overline" title={item.title} />;
    }
    return (
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
          },
        ]}
      >
        <PersonRow person={item.person} onPress={openPerson} />
        {item.last ? null : <Divider inset={72} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ConnectingNotice />
      <FlatList
        ref={list}
        data={rows}
        keyExtractor={(r) => (r.kind === 'person' ? r.person.id : `s-${r.title}`)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AppText variant="title" accessibilityRole="header">
                People
              </AppText>
              <Button
                variant="ghost"
                compact
                icon={UserPlus}
                label="Add person"
                onPress={() => setAdding(true)}
              />
            </View>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Search people"
              accessibilityLabel="Search people by name"
            />
            <SegmentedControl
              label="Show"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </View>
        }
        ListEmptyComponent={empty}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={people.isRefetching}
            onRefresh={() => void people.refetch()}
            colors={[colors.brandPrimary]}
            progressBackgroundColor={colors.surface}
          />
        }
      />
      {adding ? (
        <PersonNameDialog
          mode="add"
          onCancel={() => setAdding(false)}
          onDone={(person) => {
            setAdding(false);
            void invalidateLedger();
            snackbar('Person added');
            router.push(`/people/${person.id}`);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingBottom: space.s10 },
  header: { gap: space.s3, paddingBottom: space.s2 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  rowWrap: { borderLeftWidth: 1, borderRightWidth: 1, overflow: 'hidden' },
});
