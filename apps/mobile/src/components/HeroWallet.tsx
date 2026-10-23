/**
 * The MiniLedger wallet-notebook mark as flat vector art (design.md §10.3). Driven by open:
 * the cover swings on its spine, the wallet lifts slightly and, with coin, a ₹ coin rises out
 * of the pages. Callers animate open only on events (first load, press, a new payment).
 */
import { StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

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
  coin: '#E9AE45',
  coinRim: '#B67A1C',
  coinInk: '#5A3410',
} as const;

const VIEW_BOX = '0 0 512 512';

type Props = {
  size: number;
  /** 0 = closed, 1 = flap open; driven by the hero's press. Omit for a still mark. */
  open?: SharedValue<number>;
  /** Draw the faint rim on dark-chocolate surfaces (the light-mode hero). */
  rimmed?: boolean;
  /** A ₹ coin rises from the pages as the cover opens (Home summary card). */
  coin?: boolean;
};

export function HeroWallet({ size, open, rimmed = false, coin = false }: Props) {
  const { colors } = useTheme();
  const still = useSharedValue(0);
  const angle = open ?? still;
  // On the dark-chocolate hero the espresso frame needs a faint rim to separate from the card.
  const rim = rimmed ? colors.onHero : 'transparent';
  const flap = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { rotateY: `${-angle.get() * 28}deg` }],
  }));
  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: -angle.get() * 3 }, { rotate: `${angle.get() * 2}deg` }],
  }));
  const coinStyle = useAnimatedStyle(() => ({
    opacity: interpolate(angle.get(), [0, 0.25, 1], [0, 1, 1]),
    transform: [
      { translateY: -angle.get() * size * 0.2 },
      { rotate: `${interpolate(angle.get(), [0, 1], [-14, 6])}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[{ width: size, height: size }, lift]}
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
      {coin ? (
        <Animated.View
          style={[
            styles.coin,
            { width: size * 0.3, height: size * 0.3, left: size * 0.4, top: size * 0.16 },
            coinStyle,
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Circle
              cx={50}
              cy={50}
              r={46}
              fill={BRAND.coin}
              stroke={BRAND.coinRim}
              strokeWidth={8}
            />
            <SvgText
              x={50}
              y={68}
              fontSize={54}
              fontWeight="700"
              fill={BRAND.coinInk}
              textAnchor="middle"
            >
              ₹
            </SvgText>
          </Svg>
        </Animated.View>
      ) : null}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Hinge on the spine (x = 108 of 512) so the cover swings like the real wallet.
  hinge: { transformOrigin: '21% 50%' },
  coin: { position: 'absolute' },
});
