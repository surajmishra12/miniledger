/**
 * S03 Verify OTP, shared by sign-in and account deletion (design.md S03, S12).
 * Sign-in auto-submits exactly once at six digits; deletion mode never auto-submits.
 */
import type { ChallengeDto } from '@miniledger/shared';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { OtpInput } from '@/components/OtpInput';
import { ApiError } from '@/lib/api-client';
import { errorCopy } from '@/lib/error-copy';
import { formatCountdown, useNow } from '@/lib/hooks';
import { space } from '@/theme/tokens';

type Props = {
  challenge: ChallengeDto;
  heading: string;
  subtitle: string;
  mode: 'login' | 'delete';
  onVerify: (challengeId: string, code: string) => Promise<void>;
  onResend: () => Promise<ChallengeDto>;
  onChangeIdentifier?: () => void;
  changeLabel?: string;
  onCancel?: () => void;
};

export function OtpVerification({
  challenge: initial,
  heading,
  subtitle,
  mode,
  onVerify,
  onResend,
  onChangeIdentifier,
  changeLabel,
  onCancel,
}: Props) {
  const [challenge, setChallenge] = useState(initial);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const lastSubmitted = useRef<string | null>(null);
  const now = useNow();

  const expiresIn = (new Date(challenge.expiresAt).getTime() - now) / 1000;
  const resendIn = (new Date(challenge.resendAvailableAt).getTime() - now) / 1000;

  const submit = async (value: string) => {
    if (busy || value.length !== 6) return;
    lastSubmitted.current = value;
    setBusy(true);
    setError(null);
    try {
      await onVerify(challenge.challengeId, value);
    } catch (e) {
      setError(errorCopy(e));
      // Expired or exhausted codes need a new one: clear the cells (design.md S03).
      if (
        e instanceof ApiError &&
        (e.code === 'OTP_EXPIRED' || e.code === 'OTP_ATTEMPTS_EXCEEDED')
      ) {
        setCode('');
      }
    } finally {
      setBusy(false);
    }
  };

  const onChange = (value: string) => {
    setCode(value);
    if (error) setError(null);
    if (mode === 'login' && value.length === 6 && value !== lastSubmitted.current)
      void submit(value);
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      setChallenge(await onResend());
      setCode('');
      lastSubmitted.current = null;
    } catch (e) {
      setError(errorCopy(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.text}>
        <AppText variant="title" accessibilityRole="header">
          {heading}
        </AppText>
        <AppText color="textSecondary">{subtitle}</AppText>
      </View>

      <OtpInput value={code} onChange={onChange} error={!!error} editable={!busy} />

      {error ? (
        <AppText color="dangerText" accessibilityLiveRegion="assertive">
          {error}
        </AppText>
      ) : (
        <AppText variant="secondary" color="textSecondary">
          {expiresIn > 0
            ? `Code expires in ${formatCountdown(expiresIn)}`
            : 'This code has expired.'}
        </AppText>
      )}

      <Button
        variant={mode === 'delete' ? 'destructive' : 'primary'}
        label={mode === 'delete' ? 'Delete account' : 'Verify'}
        loadingLabel={mode === 'delete' ? 'Deleting…' : 'Verifying…'}
        loading={busy}
        disabled={code.length !== 6}
        onPress={() => void submit(code)}
      />

      <View style={styles.links}>
        {resendIn > 0 ? (
          <AppText variant="secondary" color="textSecondary">
            Resend code in {formatCountdown(resendIn)}
          </AppText>
        ) : (
          <Button
            variant="ghost"
            compact
            label="Resend code"
            loading={resending}
            onPress={() => void resend()}
          />
        )}
        {onChangeIdentifier && changeLabel ? (
          <Button variant="ghost" compact label={changeLabel} onPress={onChangeIdentifier} />
        ) : null}
        {onCancel ? <Button variant="ghost" compact label="Cancel" onPress={onCancel} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s5 },
  text: { gap: space.s2 },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s2,
  },
});
