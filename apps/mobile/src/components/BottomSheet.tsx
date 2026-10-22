import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = { visible: boolean; title: string; onClose: () => void; children: ReactNode };

/** Raised sheet over a scrim; Android back closes it (design.md §7 BottomSheet). */
export function BottomSheet({ visible, title, onClose, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel="Close"
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surfaceRaised, paddingBottom: insets.bottom + space.s5 },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.outlineStrong }]} />
        <AppText variant="section" accessibilityRole="header">
          {title}
        </AppText>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.s5,
    paddingTop: space.s3,
    gap: space.s4,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', opacity: 0.6 },
});
