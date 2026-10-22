/**
 * Account deletion (design.md S12): explanation → fresh code → destructive confirm.
 * Never shown as complete unless the server confirmed it.
 */
import type { ChallengeDto } from '@miniledger/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { InlineNotice } from '@/components/InlineNotice';
import { Screen } from '@/components/Screen';
import { deleteAccount, requestDeletionCode } from '@/features/auth/api';
import { OtpVerification } from '@/features/auth/OtpVerification';
import { useSession } from '@/features/auth/session';
import { deleteUserReceipts } from '@/features/receipts/storage';
import { errorCopy } from '@/lib/error-copy';
import { space } from '@/theme/tokens';

export default function DeleteAccountScreen() {
  const { user, forgetAccount } = useSession();
  const [challenge, setChallenge] = useState<ChallengeDto | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setSending(true);
    setError(null);
    try {
      setChallenge(await requestDeletionCode());
    } catch (e) {
      setError(errorCopy(e));
    } finally {
      setSending(false);
    }
  };

  if (challenge) {
    return (
      <Screen scroll>
        <Header back onBack={() => setChallenge(null)} />
        <OtpVerification
          mode="delete"
          challenge={challenge}
          heading="Confirm it's you"
          subtitle={`Enter the code sent to ${challenge.maskedDestination} to permanently delete your account.`}
          onVerify={async (challengeId, code) => {
            await deleteAccount({ challengeId, code });
            if (user) deleteUserReceipts(user.id);
            await forgetAccount('Your account was deleted.');
          }}
          onResend={requestDeletionCode}
          onCancel={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <View style={styles.actions}>
          <Button
            variant="destructive"
            label="Send code"
            loadingLabel="Sending…"
            loading={sending}
            onPress={() => void sendCode()}
          />
          <Button variant="secondary" label="Cancel" onPress={() => router.back()} />
        </View>
      }
    >
      <Header back />
      <View style={styles.text}>
        <AppText variant="title" accessibilityRole="header">
          Delete your account?
        </AppText>
        <AppText color="textSecondary">
          This permanently deletes your people, loans and repayments from MiniLedger, and removes
          receipt photos from this device. This can't be undone.
        </AppText>
      </View>
      {error ? <InlineNotice tone="danger" message={error} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { gap: space.s3 },
  actions: { gap: space.s3 },
});
