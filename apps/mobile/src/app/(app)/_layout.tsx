import { Stack } from 'expo-router';

import { useTheme } from '@/theme/theme-provider';

/** Signed-in area: tabs plus pushed detail/form screens. */
export default function AppLayout() {
  const { colors, reduceMotion } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
        animation: reduceMotion ? 'none' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="loans/new" />
      <Stack.Screen name="loans/[id]/index" />
      <Stack.Screen name="loans/[id]/edit" />
      <Stack.Screen
        name="loans/[id]/receipt"
        options={{
          animation: reduceMotion ? 'none' : 'fade',
          contentStyle: { backgroundColor: '#000000' },
        }}
      />
      <Stack.Screen name="loans/[id]/repayments/new" />
      <Stack.Screen name="loans/[id]/repayments/[repaymentId]" />
      <Stack.Screen name="people/[id]" />
      <Stack.Screen name="settings/delete-account" />
    </Stack>
  );
}
