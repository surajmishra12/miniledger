import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { dateFromIso, deviceToday, formatDateLong, isoFromDate } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  minimumDate?: string;
  maximumDate?: string;
  error?: string | undefined;
  helper?: string | undefined;
  placeholder?: string;
};

/** Native Android date picker behind an accessible field (design.md §7 DateField). */
export function DateField({
  label,
  value,
  onChange,
  minimumDate = '2000-01-01',
  maximumDate = '2099-12-31',
  error,
  helper,
  placeholder = 'Choose a date',
}: Props) {
  const { colors } = useTheme();

  const open = () => {
    DateTimePickerAndroid.open({
      value: dateFromIso(value ?? deviceToday()),
      mode: 'date',
      minimumDate: dateFromIso(minimumDate),
      maximumDate: dateFromIso(maximumDate),
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(isoFromDate(date));
      },
    });
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="secondary" color="textSecondary">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value ? formatDateLong(value) : 'not set'}`}
        accessibilityHint="Opens a date picker"
        onPress={open}
        style={({ pressed }) => [
          styles.box,
          {
            borderColor: error ? colors.dangerText : colors.outlineStrong,
            borderWidth: error ? 2 : 1,
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          },
        ]}
      >
        <CalendarDays size={20} color={colors.textSecondary} strokeWidth={1.75} />
        <AppText color={value ? 'textPrimary' : 'textTertiary'}>
          {value ? formatDateLong(value) : placeholder}
        </AppText>
      </Pressable>
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
}

const styles = StyleSheet.create({
  wrap: { gap: space.s2 },
  box: {
    minHeight: 56,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
  },
});
