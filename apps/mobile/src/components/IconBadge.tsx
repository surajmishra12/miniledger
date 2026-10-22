import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import type { ColorTokens } from '@/theme/tokens';

export type BadgeTone = 'lent' | 'borrowed' | 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<BadgeTone, { fg: keyof ColorTokens; bg: keyof ColorTokens }> = {
  lent: { fg: 'lentText', bg: 'lentSurface' },
  borrowed: { fg: 'borrowedText', bg: 'borrowedSurface' },
  success: { fg: 'successText', bg: 'successSurface' },
  warning: { fg: 'warningText', bg: 'warningSurface' },
  danger: { fg: 'dangerText', bg: 'dangerSurface' },
  neutral: { fg: 'textSecondary', bg: 'surfaceMuted' },
};

/** 36dp circle in the semantic surface with an 18dp semantic icon (design.md §2.3, §2.7). */
export function IconBadge({
  icon: Icon,
  tone,
  size = 36,
}: {
  icon: LucideIcon;
  tone: BadgeTone;
  size?: number;
}) {
  const { colors } = useTheme();
  const t = TONES[tone];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors[t.bg],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={Math.round(size / 2)} color={colors[t.fg]} strokeWidth={2} />
    </View>
  );
}
