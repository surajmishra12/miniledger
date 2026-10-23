/**
 * S02 Sign-in. Phone in assignment mode, email in production — chosen by the server.
 */
import { IDENTIFIER_MESSAGES, normalizeEmail, normalizePhone } from '@miniledger/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { InlineNotice } from '@/components/InlineNotice';
import { Screen } from '@/components/Screen';
import { SkeletonBlock } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { HeroWallet } from '@/components/HeroWallet';
import { Wordmark } from '@/components/Wordmark';
import { requestOtp, useAuthConfig } from '@/features/auth/api';
import { useSession } from '@/features/auth/session';
import { PRIVACY_URL } from '@/lib/config';
import { errorCopy } from '@/lib/error-copy';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

/** The wallet mark inside faint ledger rings: the one decorated moment before sign-in. */
function BrandMark() {
  const { colors } = useTheme();
  return (
    <View style={styles.mark} importantForAccessibility="no-hide-descendants">
      <Svg width={200} height={140} viewBox="0 0 200 140" style={StyleSheet.absoluteFill}>
        {[34, 50, 66].map((r) => (
          <Circle
            key={r}
            cx={100}
            cy={70}
            r={r}
            fill="none"
            stroke={colors.textPrimary}
            strokeOpacity={0.07}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
      <HeroWallet size={84} />
    </View>
  );
}

export default function SignInScreen() {
  const config = useAuthConfig();
  const { notice } = useSession();
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Never show a variant until the server says which one (no mock-OTP UI in production).
  const mode = config.data?.identifierType ?? null;
  const isPhone = mode === 'PHONE';

  const submit = async () => {
    const normalized = isPhone ? normalizePhone(value) : normalizeEmail(value);
    if (!normalized) {
      setFieldError(isPhone ? IDENTIFIER_MESSAGES.phone : IDENTIFIER_MESSAGES.email);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const challenge = await requestOtp(normalized);
      router.push({ pathname: '/verify-otp', params: { ...challenge, identifier: normalized } });
    } catch (e) {
      setError(errorCopy(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen
      scroll
      contentStyle={styles.content}
      footer={
        <Button
          label={mode === 'EMAIL' ? 'Continue with email' : 'Send code'}
          loadingLabel="Sending…"
          loading={sending}
          disabled={!config.data || value.trim() === ''}
          onPress={() => void submit()}
        />
      }
    >
      <View style={styles.brand}>
        <BrandMark />
        <Wordmark size="large" />
        <AppText variant="title" align="center">
          Your money, clearly tracked.
        </AppText>
        <AppText color="textSecondary" align="center">
          Keep track of money you lend and borrow, without spreadsheets.
        </AppText>
      </View>

      {notice ? <InlineNotice message={notice} /> : null}

      {config.isError ? (
        <InlineNotice
          tone="offline"
          message={errorCopy(config.error)}
          actionLabel="Retry"
          onAction={() => void config.refetch()}
        />
      ) : null}

      {mode === null ? (
        config.isError ? null : (
          <View style={styles.pending} accessibilityLabel="Loading">
            <SkeletonBlock height={20} width="40%" />
            <SkeletonBlock height={56} />
          </View>
        )
      ) : isPhone ? (
        <TextField
          label="Mobile number"
          value={value}
          onChangeText={(text) => {
            setValue(text.replace(/\D/g, '').slice(0, 10));
            setFieldError(undefined);
          }}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={10}
          placeholder="98765 43210"
          error={fieldError}
          prefix={
            <AppText color="textSecondary" tabular>
              +91
            </AppText>
          }
          onSubmitEditing={() => void submit()}
        />
      ) : (
        <TextField
          label="Email address"
          value={value}
          onChangeText={(text) => {
            setValue(text);
            setFieldError(undefined);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          placeholder="you@example.com"
          error={fieldError}
          onSubmitEditing={() => void submit()}
        />
      )}

      {mode ? (
        <AppText variant="secondary" color="textSecondary">
          {isPhone
            ? 'Assignment mode: find your code in the local server logs.'
            : "We'll send you a one-time code. No password needed."}
        </AppText>
      ) : null}

      {error ? <InlineNotice tone="danger" message={error} /> : null}

      <Button
        variant="ghost"
        compact
        label="Privacy policy"
        onPress={() => void Linking.openURL(PRIVACY_URL)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.s6, gap: space.s5 },
  pending: { gap: space.s2 },
  brand: { alignItems: 'center', gap: space.s3, marginBottom: space.s4 },
  mark: { width: 200, height: 140, alignItems: 'center', justifyContent: 'center' },
});
