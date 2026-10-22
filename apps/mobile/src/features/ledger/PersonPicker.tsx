/**
 * PersonPicker (design.md S06 item 3): search active people; the last row adds a new person.
 */
import { normalizeText } from '@miniledger/shared';
import { ChevronDown, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';
import { InlineNotice } from '@/components/InlineNotice';
import { SkeletonList } from '@/components/Skeleton';
import { Divider } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { errorCopy } from '@/lib/error-copy';
import { useDebounced } from '@/lib/hooks';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { usePeople } from './api';

export type PersonChoice =
  { kind: 'existing'; id: string; name: string } | { kind: 'new'; name: string };

type Props = {
  label: string;
  value: PersonChoice | null;
  onChange: (value: PersonChoice) => void;
  /** Edit mode: only existing people (design.md S06). */
  allowNew?: boolean;
  error?: string | undefined;
};

export function PersonPicker({ label, value, onChange, allowNew = true, error }: Props) {
  const { colors, reduceMotion } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const search = useDebounced(normalizeText(query));
  const people = usePeople(search ? { search } : {});

  const choose = (choice: PersonChoice) => {
    onChange(choice);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="secondary" color="textSecondary">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value ? value.name : 'not chosen'}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          {
            borderColor: error ? colors.dangerText : colors.outlineStrong,
            borderWidth: error ? 2 : 1,
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          },
        ]}
      >
        {value ? <Avatar name={value.name} size={32} /> : null}
        <AppText
          color={value ? 'textPrimary' : 'textTertiary'}
          style={styles.fill}
          numberOfLines={1}
        >
          {value ? value.name : 'Choose a person'}
        </AppText>
        {value?.kind === 'new' ? (
          <AppText variant="secondary" color="textSecondary">
            New
          </AppText>
        ) : null}
        <ChevronDown size={20} color={colors.textSecondary} strokeWidth={1.75} />
      </Pressable>
      {error ? (
        <AppText variant="secondary" color="dangerText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      <Modal
        visible={open}
        animationType={reduceMotion ? 'fade' : 'slide'}
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]}>
          <View style={styles.sheetHeader}>
            <AppText variant="section" style={styles.fill} accessibilityRole="header">
              {label}
            </AppText>
            <IconButton icon={X} label="Close" onPress={() => setOpen(false)} />
          </View>
          <View style={styles.search}>
            <TextField
              label="Search or type a name"
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCapitalize="words"
              placeholder="Rahul"
              maxLength={80}
            />
          </View>
          {people.isError ? (
            <InlineNotice
              style={styles.notice}
              tone="offline"
              message={errorCopy(people.error)}
              actionLabel="Retry"
              onAction={() => void people.refetch()}
            />
          ) : null}
          <FlatList
            data={people.data?.items ?? []}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={people.isPending ? <SkeletonList rows={3} /> : undefined}
            ItemSeparatorComponent={() => <Divider />}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => choose({ kind: 'existing', id: item.id, name: item.name })}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: pressed ? colors.surfaceMuted : colors.surface },
                ]}
              >
                <Avatar name={item.name} />
                <AppText variant="rowTitle" style={styles.fill}>
                  {item.name}
                </AppText>
              </Pressable>
            )}
            ListFooterComponent={
              allowNew && normalizeText(query) ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => choose({ kind: 'new', name: normalizeText(query) })}
                  style={({ pressed }) => [
                    styles.row,
                    styles.addRow,
                    {
                      backgroundColor: pressed ? colors.brandSubtle : colors.surface,
                      borderColor: colors.outline,
                    },
                  ]}
                >
                  <Plus size={22} color={colors.brandPrimary} strokeWidth={2} />
                  <AppText variant="rowTitle" color="brandPrimary" style={styles.fill}>
                    Add “{normalizeText(query)}” as new person
                  </AppText>
                </Pressable>
              ) : !allowNew ? (
                <AppText variant="secondary" color="textSecondary" style={styles.hint}>
                  To use someone new, add them from People first.
                </AppText>
              ) : undefined
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s2 },
  fill: { flex: 1 },
  field: {
    minHeight: 56,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.s5,
    minHeight: 56,
  },
  search: { paddingHorizontal: space.s5, paddingBottom: space.s3 },
  notice: { marginHorizontal: space.s5 },
  list: { paddingHorizontal: space.s5, paddingBottom: space.s10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s4,
    minHeight: 64,
  },
  addRow: { marginTop: space.s3, borderRadius: radius.lg, borderWidth: 1 },
  hint: { padding: space.s4 },
});
