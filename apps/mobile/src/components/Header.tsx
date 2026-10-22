import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

type Props = {
  title?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
};

/** Open, shadowless header with back and utility actions (design.md §7 AppHeader). */
export function Header({ title, back, onBack, right, large }: Props) {
  return (
    <View style={styles.row}>
      {back ? (
        <IconButton icon={ChevronLeft} label="Back" onPress={onBack ?? (() => router.back())} />
      ) : null}
      {title ? (
        <AppText
          variant={large ? 'title' : 'section'}
          accessibilityRole="header"
          numberOfLines={2}
          style={styles.title}
        >
          {title}
        </AppText>
      ) : (
        <View style={styles.title} />
      )}
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: space.s1 },
  title: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center' },
});
