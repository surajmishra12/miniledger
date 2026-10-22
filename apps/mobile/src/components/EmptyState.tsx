import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

type Props = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: ReactNode;
};

/** One-line explanation + one action (design.md §9.2). */
export function EmptyState({ title, body, actionLabel, onAction, illustration }: Props) {
  return (
    <View style={styles.wrap}>
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
        <Button label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
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
