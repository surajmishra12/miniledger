/**
 * S11 Receipt picker: one-time disclosure → Take photo / Choose photo → preview with
 * Replace / Remove and the "Saved on this device only" label (design.md S11).
 */
import type { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { Camera, ImageIcon, Receipt, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { InlineNotice } from '@/components/InlineNotice';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import {
  captureReceipt,
  markReceiptNoticeSeen,
  RECEIPT_COPY,
  receiptNoticeSeen,
  type CaptureSource,
} from './capture';

type Props = {
  /** Current receipt file URI on this device, or null. */
  uri: string | null;
  /** Changes whenever the file at `uri` is replaced (cache busting). */
  version: number;
  onPicked: (file: File) => void | Promise<void>;
  onRemove: () => void;
  onOpen?: () => void;
};

export function ReceiptAttach({ uri, version, onPicked, onRemove, onOpen }: Props) {
  const { colors } = useTheme();
  const [menu, setMenu] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<null | { message: string; settings?: boolean }>(null);

  const start = async () => {
    setProblem(null);
    if (await receiptNoticeSeen()) setMenu(true);
    else setDisclosure(true);
  };

  const pick = async (source: CaptureSource) => {
    setBusy(true);
    const result = await captureReceipt(source);
    setBusy(false);
    switch (result.kind) {
      case 'ok':
        try {
          await onPicked(result.file);
        } catch {
          setProblem({ message: RECEIPT_COPY.failed });
        }
        break;
      case 'denied':
        setProblem({ message: RECEIPT_COPY.denied, settings: !result.canAskAgain });
        break;
      case 'tooLarge':
        setProblem({ message: RECEIPT_COPY.tooLarge });
        break;
      case 'failed':
        setProblem({ message: RECEIPT_COPY.failed });
        break;
      case 'cancelled':
        break;
    }
  };

  const actions: SheetAction[] = [
    { label: 'Take photo', icon: Camera, onPress: () => void pick('camera') },
    { label: 'Choose photo', icon: ImageIcon, onPress: () => void pick('library') },
    ...(uri
      ? [{ label: 'Remove receipt', icon: Trash2, destructive: true, onPress: onRemove }]
      : []),
  ];

  return (
    <View style={styles.wrap}>
      <AppText variant="secondary" color="textSecondary">
        Receipt (optional)
      </AppText>
      {uri ? (
        <View style={[styles.preview, { borderColor: colors.outline }]}>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Receipt photo. Opens full screen"
            disabled={!onOpen}
            onPress={onOpen}
          >
            <Image
              key={version}
              source={{ uri }}
              cachePolicy="none"
              contentFit="cover"
              style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]}
              accessibilityIgnoresInvertColors
            />
          </Pressable>
          <View style={styles.previewText}>
            <AppText variant="secondary" color="textSecondary">
              {RECEIPT_COPY.localOnly}
            </AppText>
            <View style={styles.previewActions}>
              <Button
                variant="secondary"
                compact
                label="Replace"
                loading={busy}
                onPress={() => void start()}
              />
              <Button variant="ghost" compact label="Remove" onPress={onRemove} />
            </View>
          </View>
        </View>
      ) : (
        <Button
          variant="secondary"
          icon={Receipt}
          label="Add receipt photo"
          loading={busy}
          loadingLabel="Preparing photo…"
          onPress={() => void start()}
        />
      )}
      {problem ? (
        <InlineNotice
          tone="danger"
          message={problem.message}
          actionLabel={problem.settings ? 'Open settings' : undefined}
          onAction={problem.settings ? () => void Linking.openSettings() : undefined}
        />
      ) : null}

      <ConfirmDialog
        visible={disclosure}
        title="Saved on this device only"
        body={RECEIPT_COPY.notice}
        confirmLabel="Continue"
        cancelLabel={null}
        onCancel={() => setDisclosure(false)}
        onConfirm={() => {
          setDisclosure(false);
          void markReceiptNoticeSeen();
          setMenu(true);
        }}
      />
      <ActionSheet
        visible={menu}
        title="Receipt photo"
        actions={actions}
        onClose={() => setMenu(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s2 },
  preview: {
    flexDirection: 'row',
    gap: space.s3,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.s3,
    alignItems: 'center',
  },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  previewText: { flex: 1, gap: space.s2 },
  previewActions: { flexDirection: 'row', gap: space.s2, flexWrap: 'wrap' },
});
