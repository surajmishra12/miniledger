/**
 * The MiniLedger wallet-notebook mark as flat vector art for the Home hero corner
 * (design.md §10.3). The cover flap swings open a little while the hero is pressed.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/theme-provider';

/** Brand palette taken from the app icon; identical in both themes like the logo itself. */
const BRAND = {
  frame: '#4A2620',
  cover: '#C65A3A',
  spine: '#A9472C',
  edge: '#D9704F',
  page: '#FBF3E6',
  pageBack: '#EEDDC2',
  ring: '#F3E6D2',
} as const;

const VIEW_BOX = '0 0 512 512';

type Props = {
  size: number;
  /** 0 = closed, 1 = flap open; driven by the hero's press. */
  open: SharedValue<number>;
};

export function HeroWallet({ size, open }: Props) {
  const { colors, scheme } = useTheme();
  // On the dark-chocolate hero the espresso frame needs a faint rim to separate from the card.
  const rim = scheme === 'light' ? colors.onHero : 'transparent';
  const flap = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { rotateY: `${-open.get() * 26}deg` }],
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox={VIEW_BOX}>
        <Rect
          x={66}
          y={66}
          width={380}
          height={378}
          rx={92}
          fill={BRAND.frame}
          stroke={rim}
          strokeOpacity={0.16}
          strokeWidth={6}
        />
        <Path d="M112 146 L344 94 Q364 90 369 110 L378 146 Z" fill={BRAND.pageBack} />
        <Path d="M116 152 L370 116 Q390 113 394 133 L400 160 Z" fill={BRAND.page} />
        {[204, 264, 330].map((y) => (
          <Rect key={y} x={58} y={y} width={68} height={24} rx={12} fill={BRAND.ring} />
        ))}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, styles.hinge, flap]}>
        <Svg width={size} height={size} viewBox={VIEW_BOX}>
          <Path
            d="M108 142 H392 Q440 142 440 190 V392 Q440 440 392 440 H150 Q108 440 108 398 Z"
            fill={BRAND.cover}
          />
          <Path d="M412 146 Q440 152 440 190 V392 Q440 428 412 436 Z" fill={BRAND.edge} />
          <Path
            d="M108 142 H136 Q166 142 166 174 V406 Q166 440 132 440 H146 Q108 440 108 402 Z"
            fill={BRAND.spine}
          />
          <Rect x={316} y={228} width={140} height={78} rx={28} fill={BRAND.frame} />
          <Circle cx={366} cy={267} r={21} fill={BRAND.ring} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Hinge on the spine (x = 108 of 512) so the cover swings like the real wallet.
  hinge: { transformOrigin: '21% 50%' },
});
