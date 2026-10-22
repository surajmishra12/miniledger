import { CircleAlert, Info, WifiOff } from 'lucide-react-native';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

type Props = {
  message: string;
  tone?: 'info' | 'danger' | 'offline';
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
};

/** Persistent, plain-language notice with an optional action; never toast-only (design.md §7). */
export function InlineNotice({ message, tone = 'info', actionLabel, onAction, style }: Props) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.dangerText : colors.textSecondary;
  const Icon = tone === 'danger' ? CircleAlert : tone === 'offline' ? WifiOff : Info;
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
      style={[
        styles.box,
        {
          backgroundColor: tone === 'danger' ? colors.dangerSurface : colors.surfaceMuted,
          borderColor: colors.outline,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <Icon size={20} color={color} strokeWidth={1.75} />
        <AppText
          variant="secondary"
          color={tone === 'danger' ? 'dangerText' : 'textSecondary'}
          style={styles.text}
        >
          {message}
        </AppText>
      </View>
      {actionLabel && onAction ? (
        <Button variant="secondary" label={actionLabel} onPress={onAction} compact />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, borderWidth: 1, padding: space.s3, gap: space.s3 },
  row: { flexDirection: 'row', gap: space.s2, alignItems: 'flex-start' },
  text: { flex: 1 },
});
