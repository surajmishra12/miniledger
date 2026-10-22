/**
 * Phase 0 placeholder: proves the app runs on the device and can reach the local API.
 * Replaced by S01 launch routing in Phase 2.
 */
import { formatPaise, healthResponseSchema } from '@miniledger/shared';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_ORIGIN } from '@/lib/config';
import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, radius, space, typography } from '@/theme/tokens';

type Status = { state: 'checking' } | { state: 'ok'; version: string } | { state: 'error' };

async function fetchHealth(): Promise<Status> {
  try {
    const response = await fetch(`${API_ORIGIN}/health`);
    const body = healthResponseSchema.parse(await response.json());
    return { state: 'ok', version: body.version };
  } catch {
    return { state: 'error' };
  }
}

export default function ConnectivityCheck() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<Status>({ state: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchHealth().then((result) => {
      if (active) setStatus(result);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => {
    setStatus({ state: 'checking' });
    setAttempt((n) => n + 1);
  };

  const message =
    status.state === 'checking'
      ? 'Connecting to MiniLedger…'
      : status.state === 'ok'
        ? `API connected (v${status.version})`
        : "Couldn't connect. Check your connection and try again.";

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={[styles.hero, { backgroundColor: colors.heroSurface }]}>
        <Text style={[typography.overline, { color: colors.onHeroMuted }]}>YOU ARE OWED</Text>
        <Text style={[typography.hero, { color: colors.onHero, fontVariant: ['tabular-nums'] }]}>
          {formatPaise(0)}
        </Text>
      </View>

      <Text
        accessibilityLiveRegion="polite"
        style={[typography.body, styles.status, { color: colors.textSecondary }]}
      >
        {message}
      </Text>
      <Text style={[typography.secondary, { color: colors.textTertiary }]}>{API_ORIGIN}</Text>

      {status.state === 'error' && (
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? colors.brandPressed : colors.brandPrimary },
          ]}
        >
          <Text style={[typography.button, { color: colors.onBrand }]}>Retry</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: space.s5, gap: space.s4, justifyContent: 'center' },
  hero: { borderRadius: radius.xl, padding: space.s6, gap: space.s2 },
  status: { marginTop: space.s4 },
  button: {
    minHeight: MIN_TOUCH_TARGET,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
