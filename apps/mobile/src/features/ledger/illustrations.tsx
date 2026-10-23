/**
 * Empty-state art that consumes theme tokens (design.md §10.2). Accents are semantic
 * (green owed to you, rose you owe), never the terracotta action colour.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { HeroWallet } from '@/components/HeroWallet';
import { useTheme } from '@/theme/theme-provider';

/** The brand wallet resting on a soft disc with a ruled page and a green check. */
export function EmptyLedgerIllustration() {
  const { colors } = useTheme();
  return (
    <View
      style={styles.ledger}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={168} height={132} viewBox="0 0 168 132" style={StyleSheet.absoluteFill}>
        <Circle cx={84} cy={70} r={58} fill={colors.surfaceMuted} />
        <Rect
          x={14}
          y={84}
          width={56}
          height={40}
          rx={10}
          fill={colors.surface}
          stroke={colors.outline}
          strokeWidth={1.5}
        />
        <Path
          d="M24 98h30M24 110h20"
          stroke={colors.textTertiary}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx={136} cy={100} r={14} fill={colors.lentSurface} />
        <Path
          d="M129.5 100.5l4.5 4.5 8-8.5"
          stroke={colors.lentText}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <View style={styles.wallet}>
        <HeroWallet size={96} />
      </View>
    </View>
  );
}

/** Two overlapping initial circles, green and rose, joined by a gentle stroke; no faces. */
export function EmptyPeopleIllustration() {
  const { colors } = useTheme();
  return (
    <Svg
      width={136}
      height={108}
      viewBox="0 0 136 108"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx={68} cy={54} r={50} fill={colors.surfaceMuted} />
      <Circle
        cx={54}
        cy={50}
        r={22}
        fill={colors.lentSurface}
        stroke={colors.lentText}
        strokeWidth={2}
      />
      <Circle
        cx={84}
        cy={50}
        r={22}
        fill={colors.borrowedSurface}
        stroke={colors.borrowedText}
        strokeWidth={2}
        fillOpacity={0.85}
      />
      <Path
        d="M36 90c12-8 52-8 64 0"
        stroke={colors.textTertiary}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  ledger: { width: 168, height: 132 },
  wallet: { position: 'absolute', left: 36, top: 10, transform: [{ rotate: '-6deg' }] },
});
