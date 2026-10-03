import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, type Goal, type HydrationData } from '@/lib/hydration';

const STORAGE_KEY = 'hydration-data-v1';

export function emptyData(): HydrationData {
  return { settings: DEFAULT_SETTINGS, log: {}, goalOnDay: {} };
}

export async function loadData(): Promise<HydrationData> {
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

export function saveData(data: HydrationData) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
