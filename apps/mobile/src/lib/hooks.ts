import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';

/** Value that settles after `delay` ms without changes (search inputs, design.md S05). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/** Current time, re-rendered every `intervalMs` (countdowns). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** "4:59" for a number of seconds. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type TransitionEmitter = {
  addListener: (event: 'transitionEnd', listener: () => void) => () => void;
};

/**
 * True once the screen's push animation has finished (or after `fallbackMs`), so heavy lists
 * mount after the slide instead of during it (design.md S09 transition rule).
 */
export function useTransitionDone(fallbackMs = 450): boolean {
  const navigation = useNavigation() as unknown as TransitionEmitter;
  const [done, setDone] = useState(false);
  useEffect(() => {
    const finish = () => setDone(true);
    const unsubscribe = navigation.addListener('transitionEnd', finish);
    const timer = setTimeout(finish, fallbackMs);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [navigation, fallbackMs]);
  return done;
}
