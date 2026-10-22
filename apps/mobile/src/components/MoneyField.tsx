import { formatPaise, parseRupeesToPaise } from '@miniledger/shared';
import { forwardRef, useState } from 'react';

import { AppText } from './AppText';
import { TextField, type TextFieldProps, type TextInputRef } from './TextField';

/** Keeps digits and one dot with at most two decimals (design.md §7 MoneyField). */
export function sanitizeAmount(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, '');
  const [whole = '', ...rest] = cleaned.split('.');
  const fraction = rest.join('').slice(0, 2);
  const integer = whole.slice(0, 8);
  return rest.length > 0 ? `${integer}.${fraction}` : integer;
}

type Props = Omit<TextFieldProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: string;
  onChangeText: (value: string) => void;
};

/**
 * Holds the raw typed string; shows Indian grouping only when not focused.
 * The displayed format is never parsed back.
 */
export const MoneyField = forwardRef<TextInputRef, Props>(function MoneyField(
  { value, onChangeText, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const parsed = parseRupeesToPaise(value);
  const display = !focused && parsed.ok ? formatPaise(parsed.paise).slice(1) : value;

  return (
    <TextField
      ref={ref}
      large
      keyboardType="decimal-pad"
      inputMode="decimal"
      placeholder="0"
      value={display}
      onChangeText={(text) => onChangeText(sanitizeAmount(text))}
      prefix={
        <AppText variant="cardAmount" color="textSecondary">
          ₹
        </AppText>
      }
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
});
