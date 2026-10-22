/**
 * S08 Record / edit repayment (design.md S08), presented full screen.
 * The maximum is the remaining balance (plus this repayment's amount when editing).
 */
import {
  amountSchema,
  codePointLength,
  formatPaise,
  NOTE_MAX,
  paiseToRupeesInput,
  type LoanDetailDto,
  type RepaymentDto,
} from '@miniledger/shared';
import { useMutation } from '@tanstack/react-query';
import { router, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DateField } from '@/components/DateField';
import { Header } from '@/components/Header';
import { InlineNotice } from '@/components/InlineNotice';
import { MoneyField } from '@/components/MoneyField';
import { Screen } from '@/components/Screen';
import { useSnackbar } from '@/components/Snackbar';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/lib/api-client';
import { errorCopy, isConnectionProblem, OFFLINE_SAVE_COPY } from '@/lib/error-copy';
import { repaymentMaxPaise } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { newId } from '@/lib/ids';
import { invalidateLedger } from '@/lib/query-client';
import { space } from '@/theme/tokens';

import { createRepayment, updateRepayment } from './api';

type Props = { loan: LoanDetailDto; repayment?: RepaymentDto };
type Errors = Partial<Record<'amount' | 'paidOn' | 'note', string>>;

export function RepaymentForm({ loan, repayment }: Props) {
  const snackbar = useSnackbar();
  const editing = !!repayment;
  const lent = loan.direction === 'LENT';
  const today = loan.asOfDate;
  const maxPaise = repaymentMaxPaise(loan.outstandingPaise, repayment?.amountPaise);

  const initial = {
    amount: repayment ? paiseToRupeesInput(repayment.amountPaise) : '',
    paidOn: repayment?.paidOn ?? today,
    note: repayment?.note ?? '',
  };
  const [amount, setAmount] = useState(initial.amount);
  const [paidOn, setPaidOn] = useState(initial.paidOn);
  const [note, setNote] = useState(initial.note);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [leave, setLeave] = useState<null | (() => void)>(null);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  // One client ID per form: retries of this create reuse it (architecture.md §5.1).
  const [repaymentId] = useState(() => repayment?.id ?? newId());

  const dirty = amount !== initial.amount || paidOn !== initial.paidOn || note !== initial.note;
  const disablePrevention = usePreventRemove(dirty && !saved, ({ repeat }) =>
    setLeave(() => repeat),
  );

  const mutation = useMutation({
    mutationFn: () => {
      const trimmed = note.trim() || null;
      if (!repayment) {
        return createRepayment(loan.id, { id: repaymentId, amount, paidOn, note: trimmed });
      }
      const changes: { amount?: string; paidOn?: string; note?: string | null } = {};
      if (amount !== initial.amount) changes.amount = amount;
      if (paidOn !== repayment.paidOn) changes.paidOn = paidOn;
      if (trimmed !== repayment.note) changes.note = trimmed;
      return updateRepayment(loan.id, repayment.id, changes);
    },
  });

  const validate = (): Errors => {
    const next: Errors = {};
    const parsed = amountSchema.safeParse(amount);
    if (!parsed.success) next.amount = parsed.error.issues[0]?.message;
    else if (parsed.data > maxPaise) next.amount = `Maximum is ${formatPaise(maxPaise)}.`;
    if (paidOn > today) next.paidOn = "Date can't be in the future";
    if (codePointLength(note.trim()) > NOTE_MAX) next.note = `Use at most ${NOTE_MAX} characters`;
    return next;
  };

  const close = async (message = 'Repayment saved') => {
    setSaved(true);
    disablePrevention();
    haptics.success();
    await invalidateLedger(loan.id, loan.person.id);
    router.back();
    snackbar(message);
  };

  const submit = async () => {
    const found = validate();
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length) return;
    if (editing && !dirty) {
      setSaved(true);
      disablePrevention();
      router.back();
      return;
    }
    try {
      await mutation.mutateAsync();
      await close();
    } catch (error) {
      if (isConnectionProblem(error)) setNotice(OFFLINE_SAVE_COPY);
      else if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
        const f = error.fieldErrors;
        setErrors({ amount: f.amount, paidOn: f.paidOn, note: f.note });
      } else if (error instanceof ApiError && error.code === 'AMOUNT_EXCEEDS_OUTSTANDING') {
        setErrors({ amount: errorCopy(error) });
        void invalidateLedger(loan.id, loan.person.id);
      } else if (error instanceof ApiError && error.code === 'ID_CONFLICT') {
        // An earlier attempt of this form already saved the repayment (design.md §9.4).
        setConflict(true);
      } else setNotice(errorCopy(error));
    }
  };

  return (
    <Screen
      scroll
      footer={
        <Button
          label="Save repayment"
          loadingLabel="Saving…"
          loading={mutation.isPending}
          onPress={() => void submit()}
        />
      }
    >
      <Header
        back
        title={
          editing ? 'Edit repayment' : lent ? 'Record money received' : 'Record money paid back'
        }
        large
      />
      <View style={styles.context}>
        <AppText variant="rowTitle">
          {lent ? `From ${loan.person.name}` : `To ${loan.person.name}`}
        </AppText>
        <AppText color="textSecondary" tabular>
          {editing
            ? `Up to ${formatPaise(maxPaise)} (remaining ${formatPaise(loan.outstandingPaise)} + this repayment)`
            : `Remaining ${formatPaise(loan.outstandingPaise)}`}
        </AppText>
      </View>

      <View style={styles.section}>
        <MoneyField
          label="Amount"
          value={amount}
          onChangeText={(value) => {
            setAmount(value);
            setErrors((e) => ({ ...e, amount: undefined }));
          }}
          onBlur={() => {
            if (!amount) return;
            const parsed = amountSchema.safeParse(amount);
            if (!parsed.success) {
              setErrors((e) => ({ ...e, amount: parsed.error.issues[0]?.message }));
            } else if (parsed.data > maxPaise) {
              setErrors((e) => ({ ...e, amount: `Maximum is ${formatPaise(maxPaise)}.` }));
            }
          }}
          error={errors.amount}
        />
        <Button
          variant="secondary"
          compact
          label="Use full amount"
          accessibilityHint={`Fills ${formatPaise(maxPaise)}`}
          onPress={() => {
            setAmount(paiseToRupeesInput(maxPaise));
            setErrors((e) => ({ ...e, amount: undefined }));
          }}
        />
      </View>

      <DateField
        label="Date"
        value={paidOn}
        maximumDate={today}
        onChange={(value) => {
          setPaidOn(value);
          setErrors((e) => ({ ...e, paidOn: undefined }));
        }}
        error={errors.paidOn}
        helper={paidOn < loan.loanDate ? 'This is before the loan date.' : undefined}
      />

      <TextField
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={NOTE_MAX}
        style={styles.note}
        error={errors.note}
      />

      {notice ? (
        <InlineNotice
          tone={notice === OFFLINE_SAVE_COPY ? 'offline' : 'danger'}
          message={notice}
          actionLabel="Try again"
          onAction={() => void submit()}
        />
      ) : null}

      <ConfirmDialog
        visible={conflict}
        title="This was already saved."
        confirmLabel="View"
        cancelLabel={null}
        onCancel={() => void close('Repayment saved')}
        onConfirm={() => void close('Repayment saved')}
      />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  context: { gap: space.s1 },
  section: { gap: space.s3 },
  note: { minHeight: 96, textAlignVertical: 'top' },
});
