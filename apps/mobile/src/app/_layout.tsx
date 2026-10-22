/**
 * Root: providers + S01 launch routing (design.md S01).
 * Signed-in users see the (app) group; everyone else sees sign-in. The splash stays up
 * while the stored session is restored, so there is no sign-in/dashboard flicker.
 */
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { InlineNotice } from '@/components/InlineNotice';
import { SnackbarProvider } from '@/components/Snackbar';
import { Wordmark } from '@/components/Wordmark';
import { SessionProvider, useSession } from '@/features/auth/session';
import { CONNECTION_COPY } from '@/lib/error-copy';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider, useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

function LaunchError({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.launch, { backgroundColor: colors.canvas }]}>
      <Wordmark size="large" />
      <InlineNotice tone="offline" message={CONNECTION_COPY} />
      <Button label="Retry" onPress={onRetry} />
    </View>
  );
}

function RootNavigator() {
  const { status, retry } = useSession();
  const { colors, scheme, ready, reduceMotion } = useTheme();
  const launching = status === 'loading' || !ready;

  useEffect(() => {
    if (!launching) void SplashScreen.hideAsync();
  }, [launching]);

  if (launching) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {status === 'offline' ? (
        <LaunchError onRetry={retry} />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.canvas },
            animation: reduceMotion ? 'none' : 'slide_from_right',
          }}
        >
          <Stack.Protected guard={status === 'signedIn'}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={status !== 'signedIn'}>
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="verify-otp" />
          </Stack.Protected>
        </Stack>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <SnackbarProvider>
                <RootNavigator />
              </SnackbarProvider>
            </SessionProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  launch: { flex: 1, justifyContent: 'center', padding: space.s6, gap: space.s5 },
});
