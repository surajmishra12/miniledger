/**
 * Welcome-page art (design.md S00, §10.2): flat, faceless, brand palette plus the semantic
 * green / rose in small doses. Every piece sits on a soft `surfaceMuted` disc.
 */
import Svg, { Circle, ClipPath, Defs, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/theme-provider';

const BRAND = {
  terracotta: '#C65A3A',
  terracottaDeep: '#A9472C',
  espresso: '#4A2620',
  cream: '#F3E6D2',
  skin: '#E2AD86',
  skinShade: '#C98F68',
  coin: '#E9AE45',
  coinRim: '#B67A1C',
  coinInk: '#5A3410',
} as const;

const W = 280;
const H = 200;

function Frame({ children, width }: { children: React.ReactNode; width: number }) {
  const { colors } = useTheme();
  return (
    <Svg
      width={width}
      height={(width * H) / W}
      viewBox={`0 0 ${W} ${H}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx={140} cy={104} r={88} fill={colors.surfaceMuted} />
      {children}
    </Svg>
  );
}

function Coin({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={BRAND.coin} stroke={BRAND.coinRim} strokeWidth={3} />
      <Circle cx={cx} cy={cy} r={r - 6} fill="none" stroke={BRAND.coinRim} strokeOpacity={0.35} />
      <SvgText
        x={cx}
        y={cy + r * 0.38}
        fontSize={r * 1.05}
        fontWeight="700"
        fill={BRAND.coinInk}
        textAnchor="middle"
      >
        ₹
      </SvgText>
    </G>
  );
}

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <Path
      d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`}
      fill={BRAND.coin}
      opacity={0.75}
    />
  );
}

/** One arm: sleeve from the edge, cuff, palm and thumb reaching to the middle. */
function Arm({ sleeve }: { sleeve: string }) {
  return (
    <G>
      <Path d="M-6 158 C30 146 62 134 92 122 L102 146 C70 158 36 170 -6 182 Z" fill={sleeve} />
      <Path d="M88 118 L104 112 L114 138 L98 144 Z" fill={BRAND.cream} />
      <Path
        d="M106 114 C116 106 130 104 136 110 C141 115 139 123 131 126 L112 134 Z"
        fill={BRAND.skin}
      />
      <Path d="M120 108 C123 99 131 96 135 101 C137 105 133 109 128 111 Z" fill={BRAND.skinShade} />
    </G>
  );
}

/** Slide 1: two hands passing a ₹ coin. */
export function HandoverArt({ width }: { width: number }) {
  return (
    <Frame width={width}>
      {/* The arms reach in from the disc's edge instead of being cut off by the canvas. */}
      <Defs>
        <ClipPath id="handover-disc">
          <Circle cx={140} cy={104} r={88} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#handover-disc)">
        <Arm sleeve={BRAND.terracotta} />
        <G transform={`translate(${W},0) scale(-1,1)`}>
          <Arm sleeve={BRAND.espresso} />
        </G>
      </G>
      <Coin cx={140} cy={86} r={22} />
      <Sparkle x={100} y={62} s={6} />
      <Sparkle x={184} y={54} s={8} />
      <Sparkle x={172} y={92} s={4} />
    </Frame>
  );
}

/** Slide 2: a ledger page with both directions and a due-date tab. */
export function LedgerArt({ width }: { width: number }) {
  const { colors } = useTheme();
  const row = (y: number, lent: boolean, bar: number) => (
    <G key={y}>
      <Circle cx={92} cy={y} r={9} fill={colors[lent ? 'lentSurface' : 'borrowedSurface']} />
      <Path
        d={
          lent
            ? `M88 ${y + 4} L96 ${y - 4} M91 ${y - 4} H96 V${y + 1}`
            : `M96 ${y - 4} L88 ${y + 4} M93 ${y + 4} H88 V${y - 1}`
        }
        stroke={colors[lent ? 'lentText' : 'borrowedText']}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Rect
        x={108}
        y={y - 7}
        width={bar}
        height={6}
        rx={3}
        fill={colors.textTertiary}
        opacity={0.55}
      />
      <Rect x={108} y={y + 3} width={bar * 0.55} height={4} rx={2} fill={colors.outline} />
      <Rect
        x={170}
        y={y - 5}
        width={28}
        height={8}
        rx={4}
        fill={colors.textPrimary}
        opacity={0.75}
      />
    </G>
  );
  return (
    <Frame width={width}>
      <Rect
        x={72}
        y={44}
        width={140}
        height={128}
        rx={16}
        fill={colors.surface}
        stroke={colors.outline}
        strokeWidth={1.5}
      />
      {[72, 104, 136].map((y) => (
        <Rect
          key={y}
          x={64}
          y={y - 5}
          width={14}
          height={10}
          rx={5}
          fill={BRAND.cream}
          stroke={colors.outline}
        />
      ))}
      {row(78, true, 46)}
      {row(110, false, 38)}
      {row(142, true, 52)}
      <G transform="translate(176,26) rotate(8)">
        <Rect
          x={0}
          y={0}
          width={56}
          height={58}
          rx={12}
          fill={colors.surface}
          stroke={colors.outline}
          strokeWidth={1.5}
        />
        <Path d="M0 12 Q0 0 12 0 H44 Q56 0 56 12 V18 H0 Z" fill={BRAND.terracotta} />
        <SvgText x={28} y={14} fontSize={10} fontWeight="700" fill="#FFFFFF" textAnchor="middle">
          FRI
        </SvgText>
        <SvgText
          x={28}
          y={46}
          fontSize={22}
          fontWeight="700"
          fill={colors.textPrimary}
          textAnchor="middle"
        >
          24
        </SvgText>
      </G>
    </Frame>
  );
}

/** Slide 3: a gentle reminder and a happy reply. */
export function ReminderArt({ width }: { width: number }) {
  const { colors } = useTheme();
  return (
    <Frame width={width}>
      <G>
        <Rect
          x={92}
          y={42}
          width={152}
          height={50}
          rx={18}
          fill={colors.surface}
          stroke={colors.outline}
          strokeWidth={1.5}
        />
        <Path d="M222 90 L236 104 L214 92 Z" fill={colors.surface} />
        <SvgText x={110} y={63} fontSize={11.5} fontWeight="600" fill={colors.textPrimary}>
          Gentle reminder about
        </SvgText>
        <SvgText x={110} y={80} fontSize={11.5} fill={colors.textSecondary}>
          the ₹500 · due Friday
        </SvgText>
      </G>
      <G>
        <Rect x={36} y={112} width={150} height={44} rx={18} fill={colors.lentSurface} />
        <Path d="M56 154 L44 168 L70 156 Z" fill={colors.lentSurface} />
        <SvgText x={54} y={139} fontSize={12} fontWeight="600" fill={colors.lentText}>
          Sent it, thanks!
        </SvgText>
        <Circle cx={166} cy={134} r={11} fill={colors.lentText} />
        <Path
          d="M160.5 134.5 L164.5 138.5 L172 130.5"
          stroke={colors.surface}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
      <Coin cx={214} cy={150} r={14} />
      <Sparkle x={236} y={130} s={5} />
    </Frame>
  );
}
