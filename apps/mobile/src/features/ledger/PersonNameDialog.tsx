/**
 * Add person / Rename (design.md S09, S10): one required Name field. Adding warns about an
 * active person with the same name before creating a second one.
 */
import {
  nameKey,
  peopleListResponseSchema,
  personDtoSchema,
  personNameSchema,
  type PersonDto,
} from '@miniledger/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { api, ApiError } from '@/lib/api-client';
import { errorCopy, isConnectionProblem, OFFLINE_SAVE_COPY } from '@/lib/error-copy';
import { newId } from '@/lib/ids';
import { queryString } from '@/lib/query-string';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { createPerson, updatePerson } from './api';

type Props =
  | { mode: 'add'; onDone: (person: PersonDto) => void; onCancel: () => void }
  | {
      mode: 'rename';
      person: PersonDto;
      onDone: (person: PersonDto) => void;
      onCancel: () => void;
    };

/** Mount only while open: every opening starts with a fresh client ID and field. */
export function PersonNameDialog(props: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState(props.mode === 'rename' ? props.person.name : '');
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [personId] = useState(() => newId());

  const mutation = useMutation({
    mutationFn: (value: string) =>
      props.mode === 'add'
        ? createPerson({ id: personId, name: value })
        : updatePerson(props.person.id, { name: value }),
  });

  const save = async (confirmedDuplicate = false) => {
    const parsed = personNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a name');
      return;
    }
    setError(null);
    try {
      if (props.mode === 'add' && !confirmedDuplicate) {
        const matches = await api(
          `/people${queryString({ search: parsed.data })}`,
          peopleListResponseSchema,
        );
        const same = matches.items.find((p) => nameKey(p.name) === nameKey(parsed.data));
        if (same) {
          setDuplicate(same.name);
          return;
        }
      }
      props.onDone(await mutation.mutateAsync(parsed.data));
    } catch (e) {
      setDuplicate(null);
      if (props.mode === 'add' && e instanceof ApiError && e.code === 'ID_CONFLICT') {
        // An earlier attempt of this dialog already created the person: open it.
        const existing = await api(`/people/${personId}`, personDtoSchema).catch(() => null);
        if (existing) {
          props.onDone(existing);
          return;
        }
      }
      if (isConnectionProblem(e)) setError(OFFLINE_SAVE_COPY);
      else if (e instanceof ApiError && e.fieldErrors.name) setError(e.fieldErrors.name);
      else setError(errorCopy(e));
    }
  };

  const busy = mutation.isPending;
  const title = props.mode === 'add' ? 'Add person' : 'Rename';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={props.onCancel}>
      <Pressable
        accessibilityLabel="Close dialog"
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={busy ? undefined : props.onCancel}
      >
        <Pressable
          style={[styles.dialog, { backgroundColor: colors.surfaceRaised }]}
          onPress={() => undefined}
        >
          <AppText variant="section" accessibilityRole="header">
            {title}
          </AppText>
          {duplicate ? (
            <AppText accessibilityLiveRegion="polite">
              You already have someone named {duplicate}.
            </AppText>
          ) : (
            <TextField
              label="Name"
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              autoFocus
              autoCapitalize="words"
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
              error={error ?? undefined}
            />
          )}
          <View style={styles.actions}>
            <Button
              variant="secondary"
              compact
              label="Cancel"
              disabled={busy}
              onPress={duplicate ? () => setDuplicate(null) : props.onCancel}
            />
            <Button
              compact
              label={duplicate ? 'Add anyway' : props.mode === 'add' ? 'Add person' : 'Save'}
              loading={busy}
              onPress={() => void save(!!duplicate)}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', padding: space.s6 },
  dialog: {
    borderRadius: radius.xl,
    padding: space.s6,
    gap: space.s4,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.s3, flexWrap: 'wrap' },
});
