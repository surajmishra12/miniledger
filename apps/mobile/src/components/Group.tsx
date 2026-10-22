import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius } from '@/theme/tokens';

import { Divider } from './Surface';

/**
 * One resting container for related rows, hairlines between them (design.md §7.3, §2.6 level 1).
 * `inset` aligns dividers with the row text (72 when rows start with a 40dp avatar).
 */
export function Group({
  children,
  inset = 16,
  style,
}: {
  children: ReactNode;
  inset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, shadow } = useTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: colors.surface, borderColor: colors.outline },
        shadow('s1'),
        style,
      ]}
    >
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 ? <Divider inset={inset} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
});
