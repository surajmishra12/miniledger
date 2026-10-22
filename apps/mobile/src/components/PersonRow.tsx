import type { PersonDto } from '@miniledger/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { balanceLines } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';

/** Initials, name and separate per-direction balances (design.md S09 PersonRow). */
export function PersonRow({ person, onPress }: { person: PersonDto; onPress: () => void }) {
  const { colors } = useTheme();
  const lines = balanceLines(person);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[person.name, ...lines].join(', ')}
      onPress={onPress}
      android_ripple={{ color: `${colors.textPrimary}14` }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      <Avatar name={person.name} />
      <View style={styles.middle}>
        <AppText variant="rowTitle" numberOfLines={2}>
          {person.name}
        </AppText>
        <View style={styles.lines}>
          {lines.map((line) => (
            <AppText
              key={line}
              variant="secondary"
              tabular
              color={
                line.startsWith('Owes you')
                  ? 'lentText'
                  : line.startsWith('You owe')
                    ? 'borrowedText'
                    : 'textSecondary'
              }
            >
              {line}
            </AppText>
          ))}
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
  lines: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s3 },
});
