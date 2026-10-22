/**
 * Optional empty-state vectors that consume theme tokens (design.md §10.2).
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/theme-provider';

/** The logo's wallet-notebook in outline: page, entry lines, binder rings, a check. */
export function EmptyLedgerIllustration() {
  const { colors, scheme } = useTheme();
  const stroke = scheme === 'dark' ? colors.textTertiary : colors.textPrimary;
  const fill = scheme === 'dark' ? 'transparent' : colors.surface;
  return (
    <Svg
      width={156}
      height={126}
      viewBox="0 0 156 126"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect
        x={34}
        y={14}
        width={92}
        height={100}
        rx={14}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      <Path d="M58 46h48M58 64h36" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      {[38, 62, 86].map((y) => (
        <Path key={y} d={`M26 ${y}h16`} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      ))}
      <Circle cx={106} cy={90} r={12} fill="none" stroke={colors.brandPrimary} strokeWidth={2} />
      <Path
        d="M100 90l4 4 8-8"
        stroke={colors.brandPrimary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Two overlapping initial circles with a connecting stroke; no faces. */
export function EmptyPeopleIllustration() {
  const { colors, scheme } = useTheme();
  const stroke = scheme === 'dark' ? colors.textTertiary : colors.textPrimary;
  return (
    <Svg
      width={128}
      height={104}
      viewBox="0 0 128 104"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx={50} cy={52} r={26} fill="none" stroke={stroke} strokeWidth={2} />
      <Circle cx={80} cy={52} r={26} fill="none" stroke={colors.brandPrimary} strokeWidth={2} />
      <Path
        d="M30 92c10-8 58-8 68 0"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
