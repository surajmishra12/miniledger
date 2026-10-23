/**
 * Motion tokens (design.md §8.1). Every animated component reads these, so the app moves
 * with one rhythm; reduce motion is handled by each caller (duration 0 / no transform).
 */
import { Easing, type WithSpringConfig } from 'react-native-reanimated';

export const curves = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  exit: Easing.bezier(0.3, 0, 1, 1),
} as const;

/** Settles without visible overshoot. */
export const spring: WithSpringConfig = { damping: 22, stiffness: 260, mass: 1 };

/** A little bounce for the wallet's personality moments; used nowhere else. */
export const springLively: WithSpringConfig = { damping: 11, stiffness: 170, mass: 1 };

export const durations = {
  pressIn: 100,
  pressOut: 160,
  tab: 150,
  pill: 220,
  sheetIn: 280,
  sheetOut: 200,
  chip: 160,
  stagger: 40,
  amount: 450,
  progress: 400,
  success: 200,
  list: 180,
  skeleton: 1200,
  illustration: 220,
} as const;

export const pressScale = { button: 0.97, tile: 0.97, row: 0.985, add: 0.92 } as const;
