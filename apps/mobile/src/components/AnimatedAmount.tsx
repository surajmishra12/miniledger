import { formatPaise } from '@miniledger/shared';
import { useEffect, useRef, useState } from 'react';

import { durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';

import { AppText } from './AppText';

type Props = React.ComponentProps<typeof AppText> & {
  paise: number;
  /** Count up from zero on first mount (Home, once per session). */
  countUp?: boolean;
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * An amount that rolls from its previous value to the new one on confirmed data
 * (design.md §8.1). Tabular digits keep the width steady. Reduce motion: final value at once.
 */
export function AnimatedAmount({ paise, countUp = false, ...text }: Props) {
  const { reduceMotion } = useTheme();
  const [shown, setShown] = useState(countUp && !reduceMotion ? 0 : paise);
  const from = useRef(shown);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const start = from.current;
    if (start === paise || reduceMotion) {
      from.current = paise;
      setShown(paise);
      return;
    }
    const began = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - began) / durations.amount);
      const value = Math.round(start + (paise - start) * easeOut(t));
      setShown(value);
      from.current = value;
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [paise, reduceMotion]);

  return (
    <AppText tabular accessibilityLabel={formatPaise(paise)} {...text}>
      {formatPaise(shown)}
    </AppText>
  );
}
