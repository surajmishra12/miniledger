/**
 * Injectable clock. All business time comes from here (never SQL now()), so tests can control it.
 */
export type Clock = { now(): Date };

export const systemClock: Clock = { now: () => new Date() };
