/**
 * S06 Add / Edit loan (design.md S06). One full-screen form for both modes.
 * Create retries reuse the form's client ID; edits send only changed fields with `version`.
 */
import {
  amountSchema,
  codePointLength,
  dateSchema,
  loanDetailDtoSchema,
  NOTE_MAX,
  paiseToRupeesInput,
  parseRupeesToPaise,
  type LoanDto,
} from '@miniledger/shared';
import { useMutation } from '@tanstack/react-query';
import { router, usePreventRemove } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DateField } from '@/components/DateField';
import { Header } from '@/components/Header';
import { InlineNotice } from '@/components/InlineNotice';
import { MoneyField } from '@/components/MoneyField';
import { Screen } from '@/components/Screen';
import { useSnackbar } from '@/components/Snackbar';
import { TextField, type TextInputRef } from '@/components/TextField';
import { api, ApiError } from '@/lib/api-client';
import { errorCopy, isConnectionProblem, OFFLINE_SAVE_COPY } from '@/lib/error-copy';
import { deviceToday } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { newId } from '@/lib/ids';
import { invalidateLedger } from '@/lib/query-client';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { createLoan, updateLoan } from './api';
import { PersonPicker, type PersonChoice } from './PersonPicker';

type Direction = 'LENT' | 'BORROWED';

type Props =
  | {
      mode: 'create';
      initialPerson?: PersonChoice | null;
      receiptSlot?: (loanId: string) => ReactNode;
      /** Runs after the server confirmed the create (e.g. moves a pending receipt into place). */
      onCreated?: (loan: LoanDto) => Promise<{ receiptFailed?: boolean } | void>;
    }
  | {
      mode: 'edit';
      loan: LoanDto & { repaymentCount: number };
      receiptSlot?: (loanId: string) => ReactNode;
      onCreated?: never;
    };

type Errors = Partial<Record<'person' | 'amount' | 'dueDate' | 'loanDate' | 'note', string>>;

function DirectionSwitch({
  value,
  onChange,
  disabled,
}: {
  value: Direction;
  onChange: (value: Direction) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const options: { value: Direction; label: string; icon: typeof ArrowUpRight }[] = [
    { value: 'LENT', label: 'I lent', icon: ArrowUpRight },
    { value: 'BORROWED', label: 'I borrowed', icon: ArrowDownLeft },
  ];
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Direction"
      style={[styles.direction, { backgroundColor: colors.surfaceMuted }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        const tone = option.value === 'LENT' ? 'lentText' : 'borrowedText';
        const color = disabled ? 'textTertiary' : selected ? tone : 'textSecondary';
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              if (!selected) haptics.selection();
              onChange(option.value);
            }}
            style={[
              styles.directionOption,
              selected && { backgroundColor: colors.surfaceRaised, borderColor: colors.outline },
            ]}
          >
            <Icon size={22} color={colors[color]} strokeWidth={2} />
            <AppText variant="button" color={color}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LoanForm(props: Props) {
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const editing = props.mode === 'edit' ? props.loan : null;
  const today = editing?.asOfDate ?? deviceToday();

  const initial = {
    direction: (editing?.direction ?? 'LENT') as Direction,
    person: editing
      ? ({ kind: 'existing', id: editing.person.id, name: editing.person.name } as PersonChoice)
      : props.mode === 'create'
        ? (props.initialPerson ?? null)
        : null,
    amount: editing ? paiseToRupeesInput(editing.principalPaise) : '',
    dueDate: editing?.dueDate ?? null,
    loanDate: editing?.loanDate ?? today,
    note: editing?.note ?? '',
  };

  const [direction, setDirection] = useState<Direction>(initial.direction);
  const [person, setPerson] = useState<PersonChoice | null>(initial.person);
  const [amount, setAmount] = useState(initial.amount);
  const [dueDate, setDueDate] = useState<string | null>(initial.dueDate);
  const [loanDate, setLoanDate] = useState(initial.loanDate);
  const [note, setNote] = useState(initial.note);
  const [moreOpen, setMoreOpen] = useState(
    !!editing && (!!editing.note || editing.loanDate !== editing.asOfDate),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | { kind: 'changed' } | { kind: 'conflict' }>(null);
  const [leave, setLeave] = useState<null | (() => void)>(null);
  const [saved, setSaved] = useState(false);
  // One client ID per form: every retry of this create reuses it (architecture.md §5.1).
  const [loanId] = useState(() => editing?.id ?? newId());
  const amountRef = useRef<TextInputRef>(null);

  const dirty =
    direction !== initial.direction ||
    person?.name !== initial.person?.name ||
    amount !== initial.amount ||
    dueDate !== initial.dueDate ||
    loanDate !== initial.loanDate ||
    note !== initial.note;

  const disablePrevention = usePreventRemove(dirty && !saved, ({ repeat }) =>
    setLeave(() => repeat),
  );
  /** Leaves the form without the discard prompt (after a save or an explicit choice). */
  const allowLeave = () => {
    setSaved(true);
    disablePrevention();
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (!person) next.person = 'Choose a person';
    const parsedAmount = amountSchema.safeParse(amount);
    if (!parsedAmount.success) next.amount = parsedAmount.error.issues[0]?.message;
    if (!dueDate) next.dueDate = 'Choose a due date';
    else if (!dateSchema.safeParse(dueDate).success) next.dueDate = 'Enter a valid date';
    if (loanDate > today) next.loanDate = "Date can't be in the future";
    if (codePointLength(note.trim()) > NOTE_MAX) next.note = `Use at most ${NOTE_MAX} characters`;
    return next;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!editing) {
        return createLoan({
          id: loanId,
          direction,
          amount,
          dueDate: dueDate!,
          loanDate,
          note: note.trim() || null,
          ...(person!.kind === 'existing'
            ? { personId: person!.id }
            : { personName: person!.name, createNewPerson: true }),
        });
      }
      const changes: Record<string, unknown> = {};
      if (direction !== editing.direction) changes.direction = direction;
      if (person?.kind === 'existing' && person.id !== editing.person.id)
        changes.personId = person.id;
      const paise = parseRupeesToPaise(amount);
      if (paise.ok && paise.paise !== editing.principalPaise) changes.amount = amount;
      if (dueDate !== editing.dueDate) changes.dueDate = dueDate;
      if (loanDate !== editing.loanDate) changes.loanDate = loanDate;
      if ((note.trim() || null) !== editing.note) changes.note = note.trim() || null;
      return updateLoan(editing.id, { version: editing.version, ...changes });
    },
  });

  const finish = async (loan: LoanDto) => {
    allowLeave();
    haptics.success();
    await invalidateLedger(loan.id, loan.person.id);
    if (props.mode === 'create') {
      const outcome = await props.onCreated?.(loan);
      router.replace(
        outcome?.receiptFailed
          ? { pathname: '/loans/[id]', params: { id: loan.id, receiptFailed: '1' } }
          : `/loans/${loan.id}`,
      );
      snackbar('Loan saved');
    } else {
      router.back();
      snackbar('Changes saved');
    }
  };

  const submit = async () => {
    const found = validate();
    setErrors(found);
    setNotice(null);
    const first = (['person', 'amount', 'dueDate', 'loanDate', 'note'] as const).find(
      (key) => found[key],
    );
    if (first) {
      // Return to the first error: focus it if it is a text field, and announce it (§7.1).
      if (first === 'amount') amountRef.current?.focus();
      if (first === 'loanDate' || first === 'note') setMoreOpen(true);
      AccessibilityInfo.announceForAccessibility(found[first] ?? '');
      return;
    }
    try {
      await finish(await mutation.mutateAsync());
    } catch (error) {
      if (isConnectionProblem(error)) {
        setNotice(OFFLINE_SAVE_COPY);
      } else if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
        const f = error.fieldErrors;
        setErrors({
          amount: f.amount,
          dueDate: f.dueDate,
          loanDate: f.loanDate,
          note: f.note,
          person: f.personName ?? f.personId,
        });
      } else if (error instanceof ApiError && error.code === 'PERSON_ARCHIVED') {
        setErrors({ person: errorCopy(error) });
      } else if (error instanceof ApiError && error.code === 'PRINCIPAL_BELOW_REPAID') {
        setErrors({ amount: errorCopy(error) });
      } else if (error instanceof ApiError && error.code === 'DIRECTION_LOCKED') {
        setNotice(errorCopy(error));
      } else if (error instanceof ApiError && error.code === 'RECORD_CHANGED' && editing) {
        // Was it our own earlier save that landed? (architecture.md §5.2)
        const latest = await api(`/loans/${editing.id}`, loanDetailDtoSchema).catch(() => null);
        const paise = parseRupeesToPaise(amount);
        const same =
          latest &&
          latest.direction === direction &&
          latest.dueDate === dueDate &&
          latest.loanDate === loanDate &&
          latest.note === (note.trim() || null) &&
          paise.ok &&
          latest.principalPaise === paise.paise &&
          (person?.kind !== 'existing' || latest.person.id === person.id);
        if (same && latest) await finish(latest);
        else setDialog({ kind: 'changed' });
      } else if (error instanceof ApiError && error.code === 'ID_CONFLICT') {
        setDialog({ kind: 'conflict' });
      } else {
        setNotice(errorCopy(error));
      }
    }
  };

  const directionLocked = !!editing && editing.repaymentCount > 0;

  return (
    <Screen
      scroll
      footer={
        <Button
          label={editing ? 'Save changes' : 'Save loan'}
          loadingLabel="Saving…"
          loading={mutation.isPending}
          onPress={() => void submit()}
        />
      }
    >
      <Header back title={editing ? 'Edit loan' : 'Add loan'} large />

      <View style={styles.section}>
        <DirectionSwitch value={direction} onChange={setDirection} disabled={directionLocked} />
        {directionLocked ? (
          <AppText variant="secondary" color="textSecondary">
            Direction can't change after repayments are recorded.
          </AppText>
        ) : null}
      </View>

      <PersonPicker
        label={direction === 'LENT' ? 'Lent to' : 'Borrowed from'}
        value={person}
        onChange={(choice) => {
          setPerson(choice);
          setErrors((e) => ({ ...e, person: undefined }));
        }}
        allowNew={!editing}
        error={errors.person}
      />

      <MoneyField
        ref={amountRef}
        label="Original amount"
        value={amount}
        onChangeText={(value) => {
          setAmount(value);
          setErrors((e) => ({ ...e, amount: undefined }));
        }}
        // Validate on blur once something was typed (design.md §7.1).
        onBlur={() => {
          if (!amount) return;
          const parsed = amountSchema.safeParse(amount);
          if (!parsed.success) {
            setErrors((e) => ({ ...e, amount: parsed.error.issues[0]?.message }));
          }
        }}
        error={errors.amount}
      />

      <DateField
        label="Due date"
        value={dueDate}
        onChange={(value) => {
          setDueDate(value);
          setErrors((e) => ({ ...e, dueDate: undefined }));
        }}
        error={errors.dueDate}
        helper={dueDate && dueDate < loanDate ? 'Due date is before the loan date.' : undefined}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: moreOpen }}
        onPress={() => setMoreOpen(!moreOpen)}
        style={styles.more}
      >
        <AppText variant="button" color="brandPrimary">
          More details
        </AppText>
        {moreOpen ? (
          <ChevronUp size={20} color={colors.brandPrimary} />
        ) : (
          <ChevronDown size={20} color={colors.brandPrimary} />
        )}
      </Pressable>

      {moreOpen ? (
        <View style={styles.section}>
          <DateField
            label="Loan date"
            value={loanDate}
            maximumDate={today}
            onChange={(value) => {
              setLoanDate(value);
              setErrors((e) => ({ ...e, loanDate: undefined }));
            }}
            error={errors.loanDate}
          />
          <TextField
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={NOTE_MAX}
            style={styles.note}
            error={errors.note}
            helper={
              codePointLength(note) >= 450 ? `${codePointLength(note)}/${NOTE_MAX}` : undefined
            }
          />
          {props.receiptSlot?.(loanId)}
        </View>
      ) : null}

      {notice ? (
        <InlineNotice
          tone={notice === OFFLINE_SAVE_COPY ? 'offline' : 'danger'}
          message={notice}
          actionLabel="Try again"
          onAction={() => void submit()}
        />
      ) : null}

      <ConfirmDialog
        visible={leave !== null}
        title="Discard changes?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onCancel={() => setLeave(null)}
        onConfirm={() => {
          const repeat = leave;
          setLeave(null);
          repeat?.();
        }}
      />
      <ConfirmDialog
        visible={dialog?.kind === 'changed'}
        title="This loan was changed on another device."
        body="Review the latest version before editing again."
        confirmLabel="Review latest"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (!editing) return;
          allowLeave();
          setDialog(null);
          // Reopen the form with the server's current data (design.md §9.4).
          void invalidateLedger(editing.id).then(() => router.replace(`/loans/${editing.id}/edit`));
        }}
      />
      <ConfirmDialog
        visible={dialog?.kind === 'conflict'}
        title="This was already saved."
        confirmLabel="View"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          allowLeave();
          setDialog(null);
          void invalidateLedger(loanId);
          router.replace(`/loans/${loanId}`);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.s3 },
  direction: { flexDirection: 'row', borderRadius: radius.lg, padding: 4, gap: 4 },
  directionOption: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  more: { flexDirection: 'row', alignItems: 'center', gap: space.s1, minHeight: 48 },
  note: { minHeight: 96, textAlignVertical: 'top' },
});
