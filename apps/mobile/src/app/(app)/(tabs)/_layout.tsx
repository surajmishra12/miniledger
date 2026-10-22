import { Tabs } from 'expo-router/js-tabs';

import { BottomTabBar } from '@/components/BottomTabBar';
import { useTheme } from '@/theme/theme-provider';

/** Five slots: Home · People · Add · Loans · Settings (design.md §5.1). */
export default function TabsLayout() {
  const { colors, reduceMotion } = useTheme();
  return (
    <Tabs
      backBehavior="firstRoute"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? 'none' : 'fade',
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="people" options={{ title: 'People' }} />
      {/* An action, not a destination: the bar opens the Add sheet and never navigates here. */}
      <Tabs.Screen name="add" options={{ title: 'Add' }} />
      <Tabs.Screen name="loans" options={{ title: 'Loans' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
