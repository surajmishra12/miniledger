import { Tabs } from 'expo-router';
import { House, Settings2, UsersRound, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme-provider';
import { radius } from '@/theme/tokens';

/** Active icon sits on a small brandSubtle pill (design.md §5.1, §7.2). */
function TabIcon({
  icon: Icon,
  color,
  focused,
}: {
  icon: LucideIcon;
  color: ColorValue;
  focused: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, focused && { backgroundColor: colors.brandSubtle }]}>
      <Icon size={22} color={String(color)} strokeWidth={focused ? 2 : 1.75} />
    </View>
  );
}

/** Bottom navigation: three labelled destinations (design.md §5.1). */
export default function TabsLayout() {
  const { colors, font, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? 'none' : 'fade',
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
          borderTopWidth: StyleSheet.hairlineWidth * 2,
          elevation: 0,
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontFamily: font('600'), marginTop: 2 },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: (p) => <TabIcon icon={House} {...p} />,
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          tabBarIcon: (p) => <TabIcon icon={UsersRound} {...p} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: (p) => <TabIcon icon={Settings2} {...p} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 56,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
