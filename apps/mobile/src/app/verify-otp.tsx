/**
 * S03 Verify OTP for sign-in. Success switches the root guard to the signed-in app.
 */
import type { ChallengeDto } from '@miniledger/shared';
import { router, useLocalSearchParams } from 'expo-router';

import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { requestOtp, verifyOtp } from '@/features/auth/api';
import { OtpVerification } from '@/features/auth/OtpVerification';
import { useSession } from '@/features/auth/session';
import { deviceTimeZone } from '@/lib/format';

type Params = ChallengeDto & { identifier: string };

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<Params>();
  const { signIn } = useSession();
  const isPhone = params.identifier?.startsWith('+') ?? true;

  const challenge: ChallengeDto = {
    challengeId: params.challengeId,
    expiresAt: params.expiresAt,
    resendAvailableAt: params.resendAvailableAt,
    maskedDestination: params.maskedDestination,
  };

  return (
    <Screen scroll>
      <Header back />
      <OtpVerification
        challenge={challenge}
        mode="login"
        heading="Enter verification code"
        subtitle={
          isPhone
            ? `Check the server logs for the code sent to ${params.maskedDestination}`
            : `We sent a 6-digit code to ${params.maskedDestination}`
        }
        onVerify={async (challengeId, code) => {
          const timezone = deviceTimeZone() ?? undefined;
          await signIn(await verifyOtp({ challengeId, code, timezone }));
        }}
        onResend={() => requestOtp(params.identifier)}
        onChangeIdentifier={() => router.back()}
        changeLabel={isPhone ? 'Change number' : 'Change email'}
      />
    </Screen>
  );
}
