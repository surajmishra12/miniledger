/**
 * S12 Settings: account, your data, privacy and support, sign out, delete account (design.md S12).
 */
import { displayNameSchema } from '@miniledger/shared';
import { useMutation } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  ChevronRight,
  ExternalLink,
  FileX2,
  Info,
  LogOut,
  Mail,
  Palette,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Header } from '@/components/Header';
import { TONES, type BadgeTone } from '@/components/IconBadge';
import { RadioRow } from '@/components/RadioRow';
import { Screen } from '@/components/Screen';
import { useSnackbar } from '@/components/Snackbar';
import { Divider, Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { updateMe } from '@/features/auth/api';
import { useSession } from '@/features/auth/session';
import { DELETE_DATA_URL, PRIVACY_URL } from '@/lib/config';
import { errorCopy } from '@/lib/error-copy';
import { haptics } from '@/lib/haptics';
import { useTheme, type ThemePreference } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, radius, space } from '@/theme/tokens';

/** 32dp rounded square with a muted tone (design.md S12). */
function IconSquare({ icon: Icon, tone = 'neutral' }: { icon: LucideIcon; tone?: BadgeTone }) {
  const { colors } = useTheme();
  const t = TONES[tone];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={[styles.square, { backgroundColor: colors[t.bg] }]}
    >
      <Icon size={17} color={colors[t.fg]} strokeWidth={2} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" color="textSecondary" accessibilityRole="header">
        {title.toUpperCase()}
      </AppText>
      <Surface>{children}</Surface>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  external,
  icon,
  tone,
  destructive,
}: {
  label: string;
  value?: string | undefined;
  onPress?: () => void;
  external?: boolean;
  icon: LucideIcon;
  tone?: BadgeTone;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  const Icon = external ? ExternalLink : ChevronRight;
  const content = (
    <>
      <IconSquare icon={icon} tone={tone} />
      <View style={styles.rowText}>
        <AppText color={destructive ? 'dangerText' : 'textPrimary'}>{label}</AppText>
        {value ? (
          <AppText variant="secondary" color="textSecondary" numberOfLines={1}>
            {value}
          </AppText>
        ) : null}
      </View>
      {onPress ? <Icon size={20} color={colors.textSecondary} strokeWidth={1.75} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole={external ? 'link' : 'button'}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
}

function DisplayNameDialog({
  initial,
  onClose,
}: {
  initial: string;
  onClose: (saved: boolean) => void;
}) {
  const { colors } = useTheme();
  const { updateUser } = useSession();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const save = useMutation({
    mutationFn: (displayName: string | null) => updateMe({ displayName }),
  });

  const submit = async () => {
    const parsed = displayNameSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    try {
      updateUser(await save.mutateAsync(parsed.data));
      onClose(true);
    } catch (e) {
      setError(errorCopy(e));
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <Pressable
        accessibilityLabel="Close dialog"
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={save.isPending ? undefined : () => onClose(false)}
      >
        <Pressable
          style={[styles.dialog, { backgroundColor: colors.surfaceRaised }]}
          onPress={() => undefined}
        >
          <AppText variant="section" accessibilityRole="header">
            Display name
          </AppText>
          <TextField
            label="Display name (optional)"
            value={value}
            onChangeText={(text) => {
              setValue(text);
              setError(undefined);
            }}
            autoFocus
            autoCapitalize="words"
            maxLength={60}
            error={error}
            onSubmitEditing={() => void submit()}
          />
          <View style={styles.actions}>
            <Button
              variant="secondary"
              compact
              label="Cancel"
              disabled={save.isPending}
              onPress={() => onClose(false)}
            />
            <Button compact label="Save" loading={save.isPending} onPress={() => void submit()} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const APPEARANCE: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Use device setting' },
];

export default function SettingsScreen() {
  const { user, signOut } = useSession();
  const { preference, setPreference } = useTheme();
  const snackbar = useSnackbar();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll edges={['top']}>
      <Header title="Settings" large />

      <Section title="Appearance">
        <View style={styles.appearanceTitle}>
          <IconSquare icon={Palette} />
          <AppText>Theme</AppText>
        </View>
        <Divider />
        <View accessibilityRole="radiogroup" style={styles.radios}>
          {APPEARANCE.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              selected={preference === option.value}
              onPress={() => {
                if (preference !== option.value) haptics.selection();
                setPreference(option.value);
              }}
            />
          ))}
        </View>
      </Section>

      <Section title="Account">
        <Row
          icon={user?.identifierType === 'EMAIL' ? Mail : Smartphone}
          label={user?.identifierType === 'EMAIL' ? 'Email' : 'Mobile number'}
          value={user?.identifier}
        />
        <Divider />
        <Row
          icon={UserRound}
          label="Display name"
          value={user?.displayName ?? 'Not set'}
          onPress={() => setEditingName(true)}
        />
      </Section>

      <Section title="Your data">
        <View style={[styles.row, styles.paragraph]}>
          <IconSquare icon={ShieldCheck} />
          <AppText color="textSecondary" style={styles.rowText}>
            Loans and repayments are stored in your account. Receipt photos stay on this device
            only.
          </AppText>
        </View>
      </Section>

      <Section title="Privacy and support">
        <Row
          icon={ShieldCheck}
          label="Privacy policy"
          external
          onPress={() => void Linking.openURL(PRIVACY_URL)}
        />
        <Divider />
        <Row
          icon={FileX2}
          label="How to delete your data"
          external
          onPress={() => void Linking.openURL(DELETE_DATA_URL)}
        />
        <Divider />
        <Row icon={Info} label="App version" value={version} />
      </Section>

      <Surface>
        <Row icon={LogOut} label="Sign out" onPress={() => setConfirm(true)} />
      </Surface>

      <View style={styles.danger}>
        <Surface>
          <Row
            icon={Trash2}
            tone="danger"
            label="Delete account"
            destructive
            onPress={() => router.push('/settings/delete-account')}
          />
        </Surface>
      </View>

      <ConfirmDialog
        visible={confirm}
        title="Sign out?"
        body="Receipt photos stay on this device for when you sign back in."
        confirmLabel="Sign out"
        loading={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setBusy(true);
          void signOut().finally(() => setBusy(false));
        }}
      />
      {editingName ? (
        <DisplayNameDialog
          initial={user?.displayName ?? ''}
          onClose={(saved) => {
            setEditingName(false);
            if (saved) snackbar('Display name saved');
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.s2 },
  paragraph: { alignItems: 'flex-start' },
  radios: { padding: space.s2 },
  row: {
    minHeight: MIN_TOUCH_TARGET + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
  },
  rowText: { flex: 1, gap: 2 },
  danger: { marginTop: space.s4 },
  square: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearanceTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
  },
  scrim: { flex: 1, justifyContent: 'center', padding: space.s6 },
  dialog: {
    borderRadius: radius.xl,
    padding: space.s6,
    gap: space.s4,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.s3, flexWrap: 'wrap' },
});
