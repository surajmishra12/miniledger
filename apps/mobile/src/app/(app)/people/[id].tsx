/**
 * S10 Person detail: separate balances, their loans, rename / archive / delete (design.md S10).
 */
import type { LoanDto } from '@miniledger/shared';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Archive,
  ArchiveRestore,
  ArrowDownLeft,
  ArrowUpRight,
  EllipsisVertical,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ConnectingNotice } from '@/components/ConnectingNotice';
import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { InlineNotice } from '@/components/InlineNotice';
import { LoanRow } from '@/components/LoanRow';
import { SectionHeader } from '@/components/SectionHeader';
import { SkeletonBlock, SkeletonList } from '@/components/Skeleton';
import { useSnackbar } from '@/components/Snackbar';
import { SummaryTile } from '@/components/SummaryTile';
import { Divider } from '@/components/Surface';
import { deletePerson, updatePerson, useLoanList, usePerson } from '@/features/ledger/api';
import { PersonNameDialog } from '@/features/ledger/PersonNameDialog';
import { ApiError } from '@/lib/api-client';
import { errorCopy } from '@/lib/error-copy';
import { plural } from '@/lib/format';
import { useTransitionDone } from '@/lib/hooks';
import { invalidateLedger } from '@/lib/query-client';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

type Dialog = 'menu' | 'rename' | 'archive' | 'delete' | null;

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const person = usePerson(id);
  const loans = useLoanList({ personId: id, sort: 'attention' });
  // Rows mount after the push animation so the slide stays smooth (design.md S09).
  const settled = useTransitionDone();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);

  const archive = useMutation({
    mutationFn: (archived: boolean) => updatePerson(id, { archived }),
  });
  const remove = useMutation({ mutationFn: () => deletePerson(id) });

  const rows = useMemo(() => {
    const seen = new Set<string>();
    const items: LoanDto[] = [];
    for (const page of loans.data?.pages ?? []) {
      for (const loan of page.items) {
        if (!seen.has(loan.id)) {
          seen.add(loan.id);
          items.push(loan);
        }
      }
    }
    return items;
  }, [loans.data]);

  if (person.isPending) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]}>
        <View style={styles.page}>
          <Header back />
          <SkeletonBlock height={56} width="70%" />
          <View style={styles.tiles}>
            <SkeletonBlock height={132} width="48%" rounded={16} />
            <SkeletonBlock height={132} width="48%" rounded={16} />
          </View>
          <SkeletonList rows={3} />
        </View>
      </SafeAreaView>
    );
  }
  if (person.isError) {
    const missing = person.error instanceof ApiError && person.error.code === 'NOT_FOUND';
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]}>
        <View style={styles.page}>
          <Header back />
          {missing ? (
            <EmptyState
              title="This item no longer exists."
              actionLabel="Go back"
              onAction={() => router.back()}
            />
          ) : (
            <InlineNotice
              tone="offline"
              message={errorCopy(person.error)}
              actionLabel="Retry"
              onAction={() => void person.refetch()}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const data = person.data;
  const setArchived = async (archived: boolean) => {
    setError(null);
    try {
      await archive.mutateAsync(archived);
      setDialog(null);
      await invalidateLedger(undefined, id);
      snackbar(archived ? 'Person archived' : 'Person unarchived');
    } catch (e) {
      setDialog(null);
      setError(errorCopy(e));
    }
  };
  const doDelete = async () => {
    setError(null);
    try {
      await remove.mutateAsync();
      setDialog(null);
      await invalidateLedger();
      router.back();
      snackbar('Person deleted');
    } catch (e) {
      setDialog(null);
      setError(errorCopy(e));
    }
  };

  const actions: SheetAction[] = [
    { label: 'Rename', icon: Pencil, onPress: () => setDialog('rename') },
    data.archived
      ? { label: 'Unarchive', icon: ArchiveRestore, onPress: () => void setArchived(false) }
      : { label: 'Archive', icon: Archive, onPress: () => setDialog('archive') },
    ...(data.loanCount === 0
      ? [
          {
            label: 'Delete person',
            icon: Trash2,
            destructive: true,
            onPress: () => setDialog('delete'),
          },
        ]
      : []),
  ];

  const header = (
    <View style={styles.header}>
      <Header
        back
        right={
          <IconButton
            icon={EllipsisVertical}
            label="More options"
            onPress={() => setDialog('menu')}
          />
        }
      />
      <View style={styles.identity}>
        <Avatar name={data.name} size={56} muted={data.archived} />
        <View style={styles.flex}>
          <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
            {data.name}
          </AppText>
          <AppText variant="secondary" color="textSecondary">
            {plural(data.loanCount, 'loan')}
            {data.archived ? ' · Archived' : ''}
          </AppText>
        </View>
      </View>
      {data.archived ? (
        <InlineNotice
          message="Archived. Unarchive to add loans."
          actionLabel="Unarchive"
          onAction={() => void setArchived(false)}
        />
      ) : null}
      {error ? <InlineNotice tone="danger" message={error} /> : null}
      <View style={styles.tiles}>
        <SummaryTile
          icon={ArrowUpRight}
          tone={data.owesYouPaise > 0 ? 'lent' : 'neutral'}
          label="They owe you"
          paise={data.owesYouPaise}
          context={data.owesYouPaise > 0 ? 'Still to receive' : 'Nothing owed'}
        />
        <SummaryTile
          icon={ArrowDownLeft}
          tone={data.youOwePaise > 0 ? 'borrowed' : 'neutral'}
          label="You owe them"
          paise={data.youOwePaise}
          context={data.youOwePaise > 0 ? 'Still to pay back' : 'Nothing to pay back'}
        />
      </View>
      <SectionHeader title="Loans" />
    </View>
  );

  const empty =
    !settled || loans.isPending ? (
      <SkeletonList rows={3} />
    ) : loans.isError ? (
      <InlineNotice
        tone="offline"
        message="Couldn't load your loans."
        actionLabel="Retry"
        onAction={() => void loans.refetch()}
      />
    ) : (
      <EmptyState
        title={`No loans with ${data.name} yet.`}
        body="Loans you add for them appear here."
      />
    );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]}>
      <ConnectingNotice />
      <FlatList
        data={settled ? rows : []}
        keyExtractor={(loan) => loan.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        renderItem={({ item, index }) => {
          const first = index === 0;
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
              <LoanRow
                loan={item}
                showPerson={false}
                onPress={() => router.push(`/loans/${item.id}`)}
              />
              {last ? null : <Divider inset={16} />}
            </View>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={person.isRefetching || (loans.isRefetching && !loans.isFetchingNextPage)}
            onRefresh={() => {
              void person.refetch();
              void loans.refetch();
            }}
            colors={[colors.brandPrimary]}
            progressBackgroundColor={colors.surface}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (loans.hasNextPage && !loans.isFetchingNextPage) void loans.fetchNextPage();
        }}
        ListFooterComponent={
          loans.isFetchingNextPage ? <ActivityIndicator color={colors.brandPrimary} /> : undefined
        }
      />
      {data.archived ? null : (
        <View style={[styles.footer, { backgroundColor: colors.canvas }]}>
          <Button
            label={`Add loan with ${data.name}`}
            onPress={() =>
              router.push({
                pathname: '/loans/new',
                params: { personId: data.id, personName: data.name },
              })
            }
          />
        </View>
      )}

      <ActionSheet
        visible={dialog === 'menu'}
        title={data.name}
        actions={actions}
        onClose={() => setDialog((d) => (d === 'menu' ? null : d))}
      />
      {dialog === 'rename' ? (
        <PersonNameDialog
          mode="rename"
          person={data}
          onCancel={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            void invalidateLedger(undefined, id);
            snackbar('Name updated');
          }}
        />
      ) : null}
      <ConfirmDialog
        visible={dialog === 'archive'}
        title={`Archive ${data.name}?`}
        body="They'll be hidden from your people list and the loan form. Their loans stay in your history."
        confirmLabel="Archive"
        loading={archive.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() => void setArchived(true)}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title={`Delete ${data.name}?`}
        body="This can't be undone."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() => void doDelete()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { paddingHorizontal: space.s5, gap: space.s4 },
  content: { paddingHorizontal: space.s5, paddingBottom: space.s10 },
  header: { gap: space.s4, paddingBottom: space.s3 },
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  tiles: { flexDirection: 'row', gap: space.s3, flexWrap: 'wrap' },
  rowWrap: { borderLeftWidth: 1, borderRightWidth: 1, overflow: 'hidden' },
  footer: { paddingHorizontal: space.s5, paddingTop: space.s3, paddingBottom: space.s4 },
});
