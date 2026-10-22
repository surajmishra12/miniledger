import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

type Props = {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Small, legible confirmation; the safe action is the default emphasis (design.md S13). */
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
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel="Close dialog"
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={loading ? undefined : onCancel}
      >
        <Pressable
          accessibilityRole="alert"
          style={[styles.dialog, { backgroundColor: colors.surfaceRaised }]}
          onPress={() => undefined}
        >
          <AppText variant="section" accessibilityRole="header">
            {title}
          </AppText>
          {body ? <AppText color="textSecondary">{body}</AppText> : null}
          <View style={styles.actions}>
            <Button
              variant="secondary"
              label={cancelLabel}
              onPress={onCancel}
              disabled={loading}
              compact
            />
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.s3,
    marginTop: space.s2,
    flexWrap: 'wrap',
  },
});
