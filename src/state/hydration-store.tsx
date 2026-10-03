import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import {
  dateKey,
  DEFAULT_SETTINGS,
  type Entry,
  type HydrationData,
  type Settings,
} from '@/lib/hydration';
import { syncReminders } from '@/lib/reminders';

const STORAGE_KEY = 'hydration-data-v1';

type HydrationStore = {
  data: HydrationData;
  /** Current time; refreshed every minute and when the app comes back to the foreground */
  now: Date;
  addIntake: (ml: number) => void;
  removeEntry: (day: string, id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
};

const HydrationContext = createContext<HydrationStore | null>(null);

function emptyData(): HydrationData {
  return { settings: DEFAULT_SETTINGS, log: {}, goalByDay: {} };
}

async function load(): Promise<HydrationData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const saved = JSON.parse(raw) as Partial<HydrationData>;
    return {
      settings: { ...DEFAULT_SETTINGS, ...saved.settings },
      log: saved.log ?? {},
      goalByDay: saved.goalByDay ?? {},
    };
  } catch {
    return emptyData();
  }
}

export function HydrationProvider({
  children,
  onLoaded,
}: {
  children: ReactNode;
  onLoaded?: () => void;
}) {
  const [data, setData] = useState<HydrationData | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    load().then(setData);
  }, []);

  useEffect(() => {
    if (data) onLoaded?.();
  }, [data, onLoaded]);

  useEffect(() => {
    if (data) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Reschedule reminders whenever their settings change.
  const settings = data?.settings;
  const enabled = settings?.remindersEnabled;
  const wake = settings?.wakeMinutes;
  const sleep = settings?.sleepMinutes;
  const interval = settings?.intervalMinutes;
  useEffect(() => {
    if (enabled === undefined || wake === undefined || sleep === undefined || !interval) return;
    syncReminders({
      ...DEFAULT_SETTINGS,
      remindersEnabled: enabled,
      wakeMinutes: wake,
      sleepMinutes: sleep,
      intervalMinutes: interval,
    }).catch((error) => console.warn('Could not schedule reminders', error));
  }, [enabled, wake, sleep, interval]);

  // Keep "today" correct across midnight and after the app was in the background.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const addIntake = useCallback((ml: number) => {
    const at = new Date();
    const day = dateKey(at);
    const entry: Entry = { id: `${at.getTime()}-${Math.random().toString(36).slice(2, 7)}`, ml, at: at.getTime() };
    setData((prev) =>
      prev && {
        ...prev,
        log: { ...prev.log, [day]: [...(prev.log[day] ?? []), entry] },
        goalByDay: { ...prev.goalByDay, [day]: prev.settings.goalMl },
      }
    );
    setNow(at);
  }, []);

  const removeEntry = useCallback((day: string, id: string) => {
    setData((prev) =>
      prev && {
        ...prev,
        log: { ...prev.log, [day]: (prev.log[day] ?? []).filter((entry) => entry.id !== id) },
      }
    );
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, settings: { ...prev.settings, ...patch } };
      // A goal change applies to today too.
      if (patch.goalMl !== undefined) {
        next.goalByDay = { ...prev.goalByDay, [dateKey(new Date())]: patch.goalMl };
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => (data ? { data, now, addIntake, removeEntry, updateSettings } : null),
    [data, now, addIntake, removeEntry, updateSettings]
  );

  if (!value) return null;
  return <HydrationContext.Provider value={value}>{children}</HydrationContext.Provider>;
}

export function useHydration() {
  const store = useContext(HydrationContext);
  if (!store) throw new Error('useHydration must be used inside HydrationProvider');
  return store;
}
