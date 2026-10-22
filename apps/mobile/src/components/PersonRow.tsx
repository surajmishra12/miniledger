import type { PersonDto } from '@miniledger/shared';
import { ArrowDownLeft, ArrowUpRight, CheckCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { balanceItems, balanceLines } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';

const ICONS = { lent: ArrowUpRight, borrowed: ArrowDownLeft, settled: CheckCheck } as const;
const TONES = { lent: 'lentText', borrowed: 'borrowedText', settled: 'successText' } as const;

/** Initials, name and separate per-direction balances (design.md S09 PersonRow). */
export function PersonRow({ person, onPress }: { person: PersonDto; onPress: () => void }) {
  const { colors, ripple } = useTheme();
  const lines = balanceItems(person);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[person.name, ...balanceLines(person)].join(', ')}
      onPress={onPress}
      android_ripple={{ color: ripple }}
      style={styles.row}
    >
      <Avatar name={person.name} />
      <View style={styles.middle}>
        <AppText variant="rowTitle" numberOfLines={2}>
          {person.name}
        </AppText>
        <View style={styles.lines}>
          {lines.map((line) => {
            const Icon = ICONS[line.kind];
            return (
              <View key={line.kind} style={styles.line}>
                <Icon size={16} color={colors[TONES[line.kind]]} strokeWidth={1.75} />
                <AppText variant="secondary" color={TONES[line.kind]}>
                  {line.label}
                </AppText>
                {line.amount ? (
                  <AppText variant="secondary" weight="600" tabular>
                    {line.amount}
                  </AppText>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

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
  line: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
});
