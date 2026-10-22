/**
 * Haptics map (design.md §8.2). Android applies the system touch-feedback setting;
 * failures are always silent and haptics are never the only cue.
 */
import * as Haptics from 'expo-haptics';

const quiet = (p: Promise<void>) => void p.catch(() => undefined);

export const haptics = {
  /** Add button press. */
  impact: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Tab change, segment, chip, radio, direction switch. */
  selection: () => quiet(Haptics.selectionAsync()),
  /** Confirmed save, settle, repayment. */
  success: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** A destructive dialog opens. */
  warning: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Validation error on submit (once per submit). */
  error: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
