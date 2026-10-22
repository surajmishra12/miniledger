import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, space, typography } from '@/theme/tokens';

import { AppText } from './AppText';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | undefined;
  helper?: string | undefined;
  prefix?: ReactNode;
  /** Large amount typography (MoneyField). */
  large?: boolean;
};

/** Labelled input: external label, 56dp body, visible focus, error below (design.md §4, §7.1). */
export type TextInputRef = ComponentRef<typeof TextInput>;

export const TextField = forwardRef<TextInputRef, TextFieldProps>(function TextField(
  { label, error, helper, prefix, large, style, onFocus, onBlur, editable = true, ...rest },
  ref,
) {
  const { colors, font } = useTheme();
  const [focused, setFocused] = useState(false);
  const token = large ? typography.cardAmount : typography.body;
  const borderColor = error ? colors.dangerText : focused ? colors.focusRing : colors.outlineStrong;

  return (
    <View style={styles.wrap}>
      <AppText variant="secondary" color="textSecondary">
        {label}
      </AppText>
      <View
        style={[
          styles.box,
          {
            borderColor,
            borderWidth: focused || error ? 2 : 1,
            backgroundColor: editable ? colors.surface : colors.surfaceMuted,
          },
        ]}
      >
        {prefix}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.brandPrimary}
          cursorColor={colors.brandPrimary}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              fontSize: token.fontSize,
              fontFamily: font(large ? '700' : '400'),
              fontWeight: font('400') ? undefined : token.fontWeight,
            },
            large ? { fontVariant: ['tabular-nums'] } : null,
            style,
          ]}
          {...rest}
        />
      </View>
      {error ? (
        <AppText variant="secondary" color="dangerText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="secondary" color="textSecondary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.s2 },
  box: {
    minHeight: 56,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.s4,
    gap: space.s2,
  },
  input: { flex: 1, paddingVertical: space.s3 },
});
