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
  remindersPausedUntil,
  type Entry,
  type Goal,
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

function currentGoal(settings: Settings): Goal {
  return { period: settings.goalPeriod, ml: settings.goalMl };
}

function emptyData(): HydrationData {
  return { settings: DEFAULT_SETTINGS, log: {}, goalOnDay: {} };
}

async function load(): Promise<HydrationData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const saved = JSON.parse(raw) as Partial<HydrationData> & {
      /** Before weekly/monthly goals, only daily goals were recorded */
      goalByDay?: Record<string, number>;
    };
    const goalOnDay: Record<string, Goal> = { ...saved.goalOnDay };
    for (const [day, ml] of Object.entries(saved.goalByDay ?? {})) {
      goalOnDay[day] ??= { period: 'day', ml };
    }
    return {
      settings: { ...DEFAULT_SETTINGS, ...saved.settings },
      log: saved.log ?? {},
      goalOnDay,
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

  // Reschedule reminders when their settings change, when the goal for the
  // period is met (pausing them) or no longer met, and once a day to top them up.
  const reminderKey = data
    ? JSON.stringify([
        data.settings.remindersEnabled,
        data.settings.wakeMinutes,
        data.settings.sleepMinutes,
        data.settings.intervalMinutes,
        remindersPausedUntil(data, now)?.getTime() ?? null,
        dateKey(now),
      ])
    : null;
  useEffect(() => {
    if (!reminderKey) return;
    const [remindersEnabled, wakeMinutes, sleepMinutes, intervalMinutes, pausedUntil] =
      JSON.parse(reminderKey);
    syncReminders(
      { ...DEFAULT_SETTINGS, remindersEnabled, wakeMinutes, sleepMinutes, intervalMinutes },
      pausedUntil === null ? null : new Date(pausedUntil)
    ).catch((error) => console.warn('Could not schedule reminders', error));
  }, [reminderKey]);

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
        goalOnDay: { ...prev.goalOnDay, [day]: currentGoal(prev.settings) },
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
      // A goal change applies to the current period too.
      if (patch.goalMl !== undefined || patch.goalPeriod !== undefined) {
        next.goalOnDay = { ...prev.goalOnDay, [dateKey(new Date())]: currentGoal(next.settings) };
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
