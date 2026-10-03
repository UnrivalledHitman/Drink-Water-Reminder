import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { Paywall } from '@/components/paywall';
import { subscribeToPremium } from '@/lib/purchases';

/** 'loading' until the store has answered, so premium users never see ads flash or features lock. */
export type PremiumStatus = 'loading' | 'free' | 'premium';

type PremiumStore = {
  status: PremiumStatus;
  isPremium: boolean;
  /** Opens the upgrade screen, optionally saying which feature led there. */
  showPaywall: (reason?: string) => void;
  /** Development only: act as Premium without buying it. */
  simulatePremium: boolean;
  setSimulatePremium: (on: boolean) => void;
};

const SIMULATE_KEY = 'dev-simulate-premium';

const PremiumContext = createContext<PremiumStore | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [purchased, setPurchased] = useState<boolean | null>(null);
  // null until loaded (development only), so the app doesn't briefly act as free
  const [simulatePremium, setSimulateState] = useState<boolean | null>(__DEV__ ? null : false);
  const [paywall, setPaywall] = useState<{ reason?: string } | null>(null);

  useEffect(() => subscribeToPremium(setPurchased), []);

  useEffect(() => {
    if (!__DEV__) return;
    AsyncStorage.getItem(SIMULATE_KEY).then(
      (value) => setSimulateState(value === 'true'),
      () => setSimulateState(false)
    );
  }, []);

  const setSimulatePremium = useCallback((on: boolean) => {
    setSimulateState(on);
    AsyncStorage.setItem(SIMULATE_KEY, String(on));
  }, []);

  const showPaywall = useCallback((reason?: string) => setPaywall({ reason }), []);

  let status: PremiumStatus = 'loading';
  if (simulatePremium || purchased === true) status = 'premium';
  else if (simulatePremium === false && purchased === false) status = 'free';

  const value = useMemo(
    () => ({
      status,
      isPremium: status === 'premium',
      showPaywall,
      simulatePremium: simulatePremium === true,
      setSimulatePremium,
    }),
    [status, showPaywall, simulatePremium, setSimulatePremium]
  );

  return (
    <PremiumContext.Provider value={value}>
      {children}
      <Paywall visible={paywall !== null} reason={paywall?.reason} onClose={() => setPaywall(null)} />
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const store = useContext(PremiumContext);
  if (!store) throw new Error('usePremium must be used inside PremiumProvider');
  return store;
}
