import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

type Props = {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  /** Omit the cancel button (one-action notices such as the receipt disclosure). */
  cancelLabel?: string | null;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Small, legible confirmation; the safe action is the default emphasis (design.md S13).
 * Destructive dialogs give a soft warning haptic when they open (§8.2).
 */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const { colors, scheme } = useTheme();

  useEffect(() => {
    if (visible && destructive) haptics.warning();
  }, [visible, destructive]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? () => undefined : onCancel}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel="Close dialog"
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={loading ? undefined : onCancel}
      >
        <Pressable
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={[
            styles.dialog,
            { backgroundColor: colors.surfaceRaised },
            scheme === 'light' ? [styles.shadow, { shadowColor: colors.textPrimary }] : null,
          ]}
          onPress={() => undefined}
        >
          <AppText variant="section" accessibilityRole="header">
            {title}
          </AppText>
          {body ? <AppText color="textSecondary">{body}</AppText> : null}
          <View style={styles.actions}>
            {cancelLabel ? (
              <Button
                variant="secondary"
                label={cancelLabel}
                onPress={onCancel}
                disabled={loading}
                compact
              />
            ) : null}
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              label={confirmLabel}
              onPress={onConfirm}
              loading={loading}
              compact
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
    gap: space.s3,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  shadow: {
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.s3,
    marginTop: space.s2,
    flexWrap: 'wrap',
  },
});
