import type { PersonDto } from '@miniledger/shared';
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { balanceItems, balanceLines } from '@/lib/format';
import { pressScale } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Tappable } from './Tappable';

const LINES = {
  lent: { icon: ArrowUpRight, color: 'lentText' },
  borrowed: { icon: ArrowDownLeft, color: 'borrowedText' },
} as const;

/**
 * Initials, name, and each direction's balance on one quiet line (design.md S09 v2): a small
 * coloured arrow carries the direction, label and amount stay in ink; never netted.
 * Settled people recede.
 */
export const PersonRow = memo(function PersonRow({
  person,
  onPress,
}: {
  person: PersonDto;
  /** Stable handler (rows are memoised); receives the row's person. */
  onPress: (person: PersonDto) => void;
}) {
  const { colors } = useTheme();
  const lines = balanceItems(person);
  const settled = lines[0]?.kind === 'settled';
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={[person.name, ...balanceLines(person)].join(', ')}
      onPress={() => onPress(person)}
      ripple
      scaleTo={pressScale.row}
      style={styles.row}
    >
      <Avatar name={person.name} muted={settled} />
      <View style={styles.middle}>
        <AppText
          variant="rowTitle"
          numberOfLines={1}
          color={settled ? 'textSecondary' : 'textPrimary'}
        >
          {person.name}
        </AppText>
        <View style={styles.lines}>
          {lines.map((line) => {
            if (line.kind === 'settled') {
              return (
                <AppText key={line.kind} variant="secondary" color="textTertiary">
                  Settled
                </AppText>
              );
            }
            const Icon = LINES[line.kind].icon;
            return (
              <View key={line.kind} style={styles.line}>
                <Icon size={14} color={colors[LINES[line.kind].color]} strokeWidth={2.5} />
                <AppText variant="secondary" color="textSecondary">
                  {line.label}
                </AppText>
                <AppText variant="secondary" weight="700" tabular>
                  {line.amount}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} />
    </Tappable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
    minHeight: 72,
  },
  middle: { flex: 1, gap: 2 },
  lines: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s4, rowGap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
