import type { PersonDto } from '@miniledger/shared';
import { ArrowDownLeft, ArrowUpRight, CheckCheck, ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { balanceItems, balanceLines } from '@/lib/format';
import { pressScale } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Tappable } from './Tappable';

const ICONS = { lent: ArrowUpRight, borrowed: ArrowDownLeft, settled: CheckCheck } as const;
const TONES = { lent: 'lentText', borrowed: 'borrowedText', settled: 'successText' } as const;

/**
 * Initials, name and separate per-direction balances: icon + colored label + neutral amount
 * (design.md S09, §2.7). Settled people read quieter.
 */
export function PersonRow({ person, onPress }: { person: PersonDto; onPress: () => void }) {
  const { colors } = useTheme();
  const lines = balanceItems(person);
  const settled = lines[0]?.kind === 'settled';
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={[person.name, ...balanceLines(person)].join(', ')}
      onPress={onPress}
      ripple
      scaleTo={pressScale.row}
      style={styles.row}
    >
      <Avatar name={person.name} muted={settled} />
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
            const Icon = ICONS[line.kind];
            return (
              <View key={line.kind} style={styles.line}>
                <Icon size={15} color={colors[TONES[line.kind]]} strokeWidth={2} />
                <AppText variant="secondary" color={TONES[line.kind]}>
                  {line.label}
                </AppText>
                {line.amount ? (
                  <AppText variant="secondary" weight="700" tabular>
                    {line.amount}
                  </AppText>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.75} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
    minHeight: 76,
  },
  middle: { flex: 1, gap: 3 },
  lines: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s4, rowGap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
});
