import type { PersonDto } from '@miniledger/shared';
import { ArrowDownLeft, ArrowUpRight, CheckCheck, ChevronRight } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { balanceItems, balanceLines } from '@/lib/format';
import { pressScale } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Tappable } from './Tappable';

const PILLS = {
  lent: { icon: ArrowUpRight, text: 'lentText', surface: 'lentSurface' },
  borrowed: { icon: ArrowDownLeft, text: 'borrowedText', surface: 'borrowedSurface' },
} as const;

/** 3dp bar beside the initials: green owes you, rose you owe, split for both (design.md S09). */
function DirectionBar({ owesYou, youOwe }: { owesYou: boolean; youOwe: boolean }) {
  const { colors } = useTheme();
  if (!owesYou && !youOwe) return <View style={styles.barSpace} />;
  return (
    <View style={styles.bar}>
      {owesYou ? <View style={[styles.barPart, { backgroundColor: colors.lentText }]} /> : null}
      {youOwe ? <View style={[styles.barPart, { backgroundColor: colors.borrowedText }]} /> : null}
    </View>
  );
}

/**
 * Initials with a direction bar, the name, and separate per-direction balance pills: green for
 * money owed to you, rose for money you owe; never netted. Settled people read quieter.
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
      <View style={styles.lead}>
        <DirectionBar owesYou={person.owesYouPaise > 0} youOwe={person.youOwePaise > 0} />
        <Avatar name={person.name} muted={settled} />
      </View>
      <View style={styles.middle}>
        <AppText
          variant="rowTitle"
          numberOfLines={2}
          color={settled ? 'textSecondary' : 'textPrimary'}
        >
          {person.name}
        </AppText>
        <View style={styles.lines}>
          {lines.map((line) => {
            if (line.kind === 'settled') {
              return (
                <View key={line.kind} style={styles.settled}>
                  <CheckCheck size={14} color={colors.textTertiary} strokeWidth={2} />
                  <AppText variant="secondary" color="textSecondary">
                    {line.label}
                  </AppText>
                </View>
              );
            }
            const pill = PILLS[line.kind];
            const Icon = pill.icon;
            return (
              <View
                key={line.kind}
                style={[styles.pill, { backgroundColor: colors[pill.surface] }]}
              >
                <Icon size={13} color={colors[pill.text]} strokeWidth={2.25} />
                <AppText variant="secondary" color={pill.text}>
                  {line.label}
                </AppText>
                <AppText variant="secondary" color={pill.text} weight="700" tabular>
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
    paddingLeft: space.s2,
    paddingRight: space.s4,
    paddingVertical: space.s3,
    minHeight: 76,
  },
  lead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bar: { width: 3, height: 30, borderRadius: 2, overflow: 'hidden', gap: 2 },
  barPart: { flex: 1, borderRadius: 2 },
  barSpace: { width: 3 },
  middle: { flex: 1, gap: 6 },
  lines: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space.s2,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  settled: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
});
