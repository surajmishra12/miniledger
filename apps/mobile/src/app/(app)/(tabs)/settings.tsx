/**
 * S12 Settings (P0: account and sign out).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { useSession } from '@/features/auth/session';
import { space } from '@/theme/tokens';

export default function SettingsScreen() {
  const { user, signOut } = useSession();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Screen scroll edges={['top']}>
      <Header title="Settings" large />

      <View style={styles.section}>
        <AppText variant="overline" color="textSecondary">
          ACCOUNT
        </AppText>
        <Surface style={styles.card}>
          <AppText variant="secondary" color="textSecondary">
            {user?.identifierType === 'EMAIL' ? 'Signed in as' : 'Mobile number'}
          </AppText>
          <AppText variant="rowTitle">{user?.identifier}</AppText>
        </Surface>
      </View>

      <View style={styles.section}>
        <AppText variant="overline" color="textSecondary">
          YOUR DATA
        </AppText>
        <Surface style={styles.card}>
          <AppText color="textSecondary">
            Loans and repayments are stored in your account. Receipt photos stay on this device
            only.
          </AppText>
        </Surface>
      </View>

      <Button variant="secondary" label="Sign out" onPress={() => setConfirm(true)} />

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.s2 },
  card: { padding: space.s4, gap: space.s1 },
});
