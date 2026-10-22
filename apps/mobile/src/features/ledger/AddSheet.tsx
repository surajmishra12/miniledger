/**
 * S14 Add sheet: decide the direction first, then open the loan form with the person picker
 * already open (design.md S14, S06). Opened from the bottom-bar Add button and empty states.
 */
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { IconBadge } from '@/components/IconBadge';
import { Divider } from '@/components/Surface';
import { Tappable } from '@/components/Tappable';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

type AddSheetValue = { visible: boolean; open: () => void; close: () => void };

const AddSheetContext = createContext<AddSheetValue>({
  visible: false,
  open: () => undefined,
  close: () => undefined,
});

export const useAddSheet = () => useContext(AddSheetContext);

function Option({
  icon,
  tone,
  title,
  body,
  onPress,
}: {
  icon: LucideIcon;
  tone: 'lent' | 'borrowed';
  title: string;
  body: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${body}`}
      onPress={onPress}
      ripple
      scaleTo={0.985}
      style={styles.option}
    >
      <IconBadge icon={icon} tone={tone} size={44} />
      <View style={styles.optionText}>
        <AppText variant="rowTitle">{title}</AppText>
        <AppText variant="secondary" color="textSecondary">
          {body}
        </AppText>
      </View>
      <ChevronRight size={20} color={colors.textTertiary} strokeWidth={1.75} />
    </Tappable>
  );
}

export function AddSheetProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => {
    haptics.impact();
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ visible, open, close }), [visible, open, close]);

  const choose = (direction: 'LENT' | 'BORROWED') => {
    setVisible(false);
    router.push({ pathname: '/loans/new', params: { direction, pick: '1' } });
  };

  return (
    <AddSheetContext.Provider value={value}>
      {children}
      <BottomSheet visible={visible} title="Add" onClose={close}>
        <View
          style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.outline }]}
        >
          <Option
            icon={ArrowUpRight}
            tone="lent"
            title="I lent money"
            body="Someone owes you"
            onPress={() => choose('LENT')}
          />
          <Divider inset={72} />
          <Option
            icon={ArrowDownLeft}
            tone="borrowed"
            title="I borrowed money"
            body="You owe someone"
            onPress={() => choose('BORROWED')}
          />
        </View>
      </BottomSheet>
    </AddSheetContext.Provider>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    paddingHorizontal: space.s4,
    minHeight: 76,
  },
  optionText: { flex: 1, gap: 2 },
});
