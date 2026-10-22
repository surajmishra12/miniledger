import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';

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

/** Overflow menu as a bottom sheet: one labelled row per action (design.md §7 BottomSheet). */
export function ActionSheet({ visible, title, actions, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View accessibilityRole="menu">
        {actions.map((action) => {
          const Icon = action.icon;
          const color = action.destructive ? 'dangerText' : 'textPrimary';
          return (
            <Pressable
              key={action.label}
              accessibilityRole="menuitem"
              onPress={() => {
                onClose();
                action.onPress();
              }}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.surfaceMuted },
              ]}
            >
              {Icon ? <Icon size={22} color={colors[color]} strokeWidth={1.75} /> : null}
              <AppText color={color}>{action.label}</AppText>
            </Pressable>
          );
        })}
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
