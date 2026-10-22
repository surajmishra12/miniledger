import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { IconButton } from './IconButton';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
};

/** Pill search field with a clear button; never auto-focused (design.md S05, S09). */
export function SearchField({ value, onChangeText, placeholder, accessibilityLabel }: Props) {
  const { colors, font } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: colors.surface,
          borderColor: focused ? colors.focusRing : colors.outlineStrong,
          borderWidth: focused ? 2 : 1,
        },
      ]}
    >
      <Search size={20} color={colors.textSecondary} strokeWidth={1.75} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        selectionColor={colors.brandPrimary}
        cursorColor={colors.brandPrimary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { color: colors.textPrimary, fontFamily: font('400') }]}
      />
      {value ? (
        <IconButton
          icon={X}
          label="Clear search"
          color="textSecondary"
          onPress={() => onChangeText('')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    minHeight: 48,
    borderRadius: radius.full,
    paddingLeft: space.s4,
    paddingRight: space.s1,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: space.s2 },
});
