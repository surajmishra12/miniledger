import { X, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, radius, space, type ColorTokens } from '@/theme/tokens';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Divider } from './Surface';

export type SheetAction = {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  actions: SheetAction[];
  onClose: () => void;
};

function Row({
  label,
  icon: Icon,
  color,
  onPress,
}: {
  label: string;
  icon?: LucideIcon | undefined;
  color: keyof ColorTokens;
  onPress: () => void;
}) {
  const { colors, ripple } = useTheme();
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: ripple }}
      style={styles.row}
    >
      {Icon ? <Icon size={22} color={colors[color]} strokeWidth={1.75} /> : null}
      <AppText color={color}>{label}</AppText>
    </Pressable>
  );
}

/** Overflow menu as a bottom sheet: one labelled row per action, then Cancel (design.md S11). */
export function ActionSheet({ visible, title, actions, onClose }: Props) {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View accessibilityRole="menu">
        {actions.map((action) => (
          <Row
            key={action.label}
            label={action.label}
            icon={action.icon}
            color={action.destructive ? 'dangerText' : 'textPrimary'}
            onPress={() => {
              onClose();
              action.onPress();
            }}
          />
        ))}
        <Divider inset={0} />
        <Row label="Cancel" icon={X} color="textSecondary" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH_TARGET + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    borderRadius: radius.md,
    paddingHorizontal: space.s2,
  },
});
