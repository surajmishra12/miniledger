import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import { ConnectingNotice } from './ConnectingNotice';

type Props = {
  children: ReactNode;
  /** Wrap content in a keyboard-aware ScrollView (forms). */
  scroll?: boolean;
  /** Content pinned to the bottom above the keyboard and system bar (sticky CTA). */
  footer?: ReactNode;
  edges?: Edge[];
  contentStyle?: ViewStyle;
};

/** Page shell: canvas background, safe areas, 20dp gutters, cold-start notice. */
export function Screen({
  children,
  scroll,
  footer,
  edges = ['top', 'bottom'],
  contentStyle,
}: Props) {
  const { colors } = useTheme();
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]} edges={edges}>
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ConnectingNotice />
        {body}
        {footer ? (
          <View style={[styles.footer, { backgroundColor: colors.canvas }]}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingBottom: space.s6, gap: space.s4 },
  footer: { paddingHorizontal: space.s5, paddingTop: space.s3, paddingBottom: space.s4 },
});
