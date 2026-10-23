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
      style={[
        styles.option,
        { backgroundColor: colors[tone === 'lent' ? 'lentSurface' : 'borrowedSurface'] },
      ]}
    >
      <IconBadge icon={icon} tone={tone} size={44} onTint />
      <View style={styles.optionText}>
        <AppText variant="rowTitle" color={tone === 'lent' ? 'lentText' : 'borrowedText'}>
          {title}
        </AppText>
        <AppText variant="secondary" color="textSecondary">
          {body}
        </AppText>
      </View>
      <ChevronRight
        size={20}
        color={colors[tone === 'lent' ? 'lentText' : 'borrowedText']}
        strokeWidth={1.75}
      />
    </Tappable>
  );
}

export function AddSheetProvider({ children }: { children: ReactNode }) {
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
        <View style={styles.group}>
          <Option
            icon={ArrowUpRight}
            tone="lent"
            title="I lent money"
            body="Someone owes you"
            onPress={() => choose('LENT')}
          />
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
  group: { gap: space.s3 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    paddingHorizontal: space.s4,
    minHeight: 80,
    borderRadius: radius.lg,
  },
  optionText: { flex: 1, gap: 2 },
});
