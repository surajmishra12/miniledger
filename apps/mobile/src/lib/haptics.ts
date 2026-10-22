/**
 * Haptics (design.md §8.2): light selection ticks and a small success after confirmed saves.
 * Android applies the user's system touch-feedback setting; failures are always silent.
 */
import * as Haptics from 'expo-haptics';

export const haptics = {
  /** A selected toggle, segment or chip. */
  selection: () => void Haptics.selectionAsync().catch(() => undefined),
  /** After the server confirms a money change. */
  success: () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  /** Opening a destructive confirmation. */
  warning: () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};
