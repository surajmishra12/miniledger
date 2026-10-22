import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button, type ButtonVariant } from './Button';
import { Rise } from './Rise';

type Props = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Tab screens use `secondary` so the bar's Add stays the one filled accent (design.md §7.3). */
  actionVariant?: ButtonVariant;
  illustration?: ReactNode;
};

/** One-line explanation + one action (design.md §9.2), with a one-time gentle fade-in. */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  illustration,
}: Props) {
  return (
    <Rise style={styles.wrap}>
      {illustration}
      <AppText variant="section" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText color="textSecondary" align="center">
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant={actionVariant}
          style={styles.button}
        />
      ) : null}
    </Rise>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s10,
    paddingHorizontal: space.s4,
  },
  button: { alignSelf: 'stretch', marginTop: space.s2 },
});
