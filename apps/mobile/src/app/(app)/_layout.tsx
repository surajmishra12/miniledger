import { Stack } from 'expo-router';

import { useTheme } from '@/theme/theme-provider';

/** Signed-in area: tabs plus pushed detail/form screens. */
export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="loans/new" />
      <Stack.Screen name="loans/[id]/index" />
    </Stack>
  );
}
