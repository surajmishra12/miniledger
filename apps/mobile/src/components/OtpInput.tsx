import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
};

const LENGTH = 6;

/** Soft blinking caret in the active empty cell; steady under reduce motion. */
function Caret() {
  const { colors, reduceMotion } = useTheme();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(
      withRepeat(
        withSequence(withTiming(0.15, { duration: 480 }), withTiming(1, { duration: 480 })),
        -1,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[styles.caret, { backgroundColor: colors.focusRing }, style]} />;
}

/** One logical 6-digit field shown as six cells; supports paste and SMS autofill (design.md S03). */
export function OtpInput({ value, onChange, error, editable = true, autoFocus = true }: Props) {
  const { colors } = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false} style={styles.wrap}>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, LENGTH))}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={LENGTH}
        autoFocus={autoFocus}
        editable={editable}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={`Verification code, ${value.length} of ${LENGTH} digits entered`}
        style={styles.hiddenInput}
      />
      <View style={styles.cells} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: LENGTH }, (_, i) => {
          const active = focused && i === Math.min(value.length, LENGTH - 1);
          return (
            <View
              key={i}
              style={[
                styles.cell,
                {
                  backgroundColor: value[i] && !error ? colors.surfaceRaised : colors.surface,
                  borderColor: error
                    ? colors.dangerText
                    : active
                      ? colors.focusRing
                      : colors.outlineStrong,
                  borderWidth: active || error ? 2 : 1,
                },
              ]}
            >
              {active && !value[i] ? (
                <Caret />
              ) : (
                <AppText variant="cardAmount" tabular>
                  {value[i] ?? ''}
                </AppText>
              )}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0 },
  cells: { flexDirection: 'row', gap: space.s2, justifyContent: 'space-between' },
  caret: { width: 2, height: 26, borderRadius: 1 },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
