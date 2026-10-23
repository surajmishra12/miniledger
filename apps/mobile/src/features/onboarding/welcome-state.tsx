/**
 * Whether this device has seen the welcome pages (design.md S00). Read once at launch while the
 * native splash is still up, so the first frame is already the right screen.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'miniledger:welcomed';

type WelcomeValue = { ready: boolean; welcomed: boolean; finish: () => void };

const WelcomeContext = createContext<WelcomeValue>({
  ready: true,
  welcomed: true,
  finish: () => undefined,
});

export function WelcomeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [welcomed, setWelcomed] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(KEY)
      .then((value) => setWelcomed(value === '1'))
      .catch(() => setWelcomed(true)) // Never trap someone on the welcome pages.
      .finally(() => setReady(true));
  }, []);

  const finish = useCallback(() => {
    setWelcomed(true);
    void AsyncStorage.setItem(KEY, '1').catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ ready, welcomed, finish }), [ready, welcomed, finish]);
  return <WelcomeContext.Provider value={value}>{children}</WelcomeContext.Provider>;
}

export const useWelcome = () => useContext(WelcomeContext);
