/**
 * S09 People: Active / Archived, search, add person (design.md S09).
 */
import { normalizeText, type PersonDto } from '@miniledger/shared';
import { router } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { ConnectingNotice } from '@/components/ConnectingNotice';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { InlineNotice } from '@/components/InlineNotice';
import { PersonRow } from '@/components/PersonRow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SkeletonList } from '@/components/Skeleton';
import { useSnackbar } from '@/components/Snackbar';
import { Divider } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { usePeople } from '@/features/ledger/api';
import { EmptyPeopleIllustration } from '@/features/ledger/illustrations';
import { PersonNameDialog } from '@/features/ledger/PersonNameDialog';
import { errorCopy } from '@/lib/error-copy';
import { useDebounced } from '@/lib/hooks';
import { invalidateLedger } from '@/lib/query-client';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

type Tab = 'active' | 'archived';

export default function PeopleScreen() {
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const search = useDebounced(normalizeText(query));
  const people = usePeople({
    ...(search ? { search } : {}),
    ...(tab === 'archived' ? { archived: true } : {}),
  });
  const items = people.data?.items ?? [];

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
      onAction={() => setAdding(true)}
    />
  );

  const renderItem = ({ item, index }: { item: PersonDto; index: number }) => {
    const first = index === 0;
    const last = index === items.length - 1;
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
        <PersonRow person={item} onPress={() => router.push(`/people/${item.id}`)} />
        {last ? null : <Divider />}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ConnectingNotice />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AppText variant="title" accessibilityRole="header">
                People
              </AppText>
              <IconButton icon={UserPlus} label="Add person" onPress={() => setAdding(true)} />
            </View>
            <TextField
              label="Search people"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              placeholder="Rahul"
              returnKeyType="search"
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
  header: { gap: space.s4, paddingBottom: space.s4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  rowWrap: { borderLeftWidth: 1, borderRightWidth: 1, overflow: 'hidden' },
});
