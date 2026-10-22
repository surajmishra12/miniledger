/**
 * Five-slot bottom bar (design.md §5.1): Home · People · Add · Loans · Settings.
 * The active destination sits on a sliding brandSubtle pill; Add is a raised action that opens
 * the S14 sheet and turns its plus into × while the sheet is open.
 */
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import {
  House,
  NotebookText,
  Plus,
  Settings2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAddSheet } from '@/features/ledger/AddSheet';
import { haptics } from '@/lib/haptics';
import { durations, pressScale, spring } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';

import { AppText } from './AppText';

const ICONS: Record<string, LucideIcon> = {
  index: House,
  people: UsersRound,
  loans: NotebookText,
  settings: Settings2,
};

const PILL_WIDTH = 56;
const PILL_HEIGHT = 30;
const BAR_HEIGHT = 64;
const ADD_SIZE = 52;

function AddButton() {
  const { colors, shadow, reduceMotion } = useTheme();
  const sheet = useAddSheet();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.set(
      reduceMotion
        ? sheet.visible
          ? 45
          : 0
        : withTiming(sheet.visible ? 45 : 0, { duration: durations.sheetIn }),
    );
  }, [sheet.visible, reduceMotion, rotation]);

  const circle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const icon = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sheet.visible ? 'Close' : 'Add loan'}
      onPress={() => (sheet.visible ? sheet.close() : sheet.open())}
      onPressIn={() => {
        if (!reduceMotion) scale.set(withTiming(pressScale.add, { duration: durations.pressIn }));
      }}
      onPressOut={() => {
        scale.set(withTiming(1, { duration: durations.pressOut }));
      }}
      style={styles.slot}
    >
      <Animated.View
        style={[styles.add, { backgroundColor: colors.brandPrimary }, shadow('s2'), circle]}
      >
        <Animated.View style={icon}>
          <Plus size={26} color={colors.onBrand} strokeWidth={2.25} />
        </Animated.View>
      </Animated.View>
      <AppText variant="overline" color="textSecondary" style={styles.addLabel}>
        Add
      </AppText>
    </Pressable>
  );
}

export function BottomTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const { colors, shadow, scheme, reduceMotion } = useTheme();
  const [width, setWidth] = useState(0);
  const slot = width / state.routes.length;
  const pillX = useSharedValue(0);
  const ready = width > 0;

  useEffect(() => {
    if (!ready) return;
    const target = state.index * slot + (slot - PILL_WIDTH) / 2;
    pillX.set(reduceMotion ? target : withSpring(target, spring));
  }, [state.index, slot, ready, reduceMotion, pillX]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.get() }] }));
  const focusedName = state.routes[state.index]?.name;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
          paddingBottom: insets.bottom,
          height: BAR_HEIGHT + insets.bottom,
        },
        scheme === 'light' ? shadow('s2up') : null,
      ]}
    >
      {ready && focusedName !== 'add' ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { backgroundColor: colors.brandSubtle }, pill]}
        />
      ) : null}
      <View role="tablist" style={styles.row}>
        {state.routes.map((route, index) => {
          if (route.name === 'add') return <AddButton key={route.key} />;
          const focused = index === state.index;
          const options = descriptors[route.key]?.options;
          const label = options?.title ?? route.name;
          const Icon = ICONS[route.name] ?? House;
          const color = focused ? colors.brandPrimary : colors.textSecondary;
          return (
            <Pressable
              key={route.key}
              role="tab"
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  haptics.selection();
                  navigateToTab(route.key);
                }
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.slot}
            >
              <View style={styles.iconBox}>
                <Icon size={22} color={color} strokeWidth={focused ? 2.1 : 1.75} />
              </View>
              <AppText
                variant="overline"
                weight={focused ? '700' : '600'}
                color={focused ? 'brandPrimary' : 'textSecondary'}
                style={styles.label}
                numberOfLines={1}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth * 2 },
  row: { flexDirection: 'row', height: BAR_HEIGHT },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconBox: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    top: (BAR_HEIGHT - PILL_HEIGHT - 18) / 2,
    left: 0,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
  },
  label: { letterSpacing: 0.2 },
  add: {
    width: ADD_SIZE,
    height: ADD_SIZE,
    borderRadius: ADD_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  addLabel: { letterSpacing: 0.2, marginTop: 2 },
});
