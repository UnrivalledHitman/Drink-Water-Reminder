export type Settings = {
  goalMl: number;
  weightKg: number | null;
  /** Minutes after midnight */
  wakeMinutes: number;
  /** Minutes after midnight */
  sleepMinutes: number;
  intervalMinutes: number;
  remindersEnabled: boolean;
  cupSizes: number[];
};

export type Entry = {
  id: string;
  ml: number;
  /** Epoch milliseconds */
  at: number;
};

export type HydrationData = {
  settings: Settings;
  /** Entries keyed by local date, e.g. "2026-10-03" */
  log: Record<string, Entry[]>;
  /** The goal in effect on each day, so history survives goal changes */
  goalByDay: Record<string, number>;
};

export const DEFAULT_SETTINGS: Settings = {
  goalMl: 2000,
  weightKg: null,
  wakeMinutes: 7 * 60,
  sleepMinutes: 22 * 60,
  intervalMinutes: 60,
  remindersEnabled: false,
  cupSizes: [150, 250, 500],
};

export const MIN_GOAL_ML = 500;
export const MAX_GOAL_ML = 6000;
export const REMINDER_INTERVALS = [30, 45, 60, 90, 120];
/** iOS keeps at most 64 pending notifications; leave room for a snooze. */
export const MAX_DAILY_REMINDERS = 60;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** About 35 ml per kg of body weight, rounded to the nearest 50 ml. */
export function goalFromWeight(weightKg: number) {
  return clamp(Math.round((weightKg * 35) / 50) * 50, MIN_GOAL_ML, MAX_GOAL_ML);
}

export function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function totalMl(entries: Entry[] | undefined) {
  return (entries ?? []).reduce((sum, entry) => sum + entry.ml, 0);
}

export function goalForDay(data: HydrationData, key: string) {
  return data.goalByDay[key] ?? data.settings.goalMl;
}

/** Consecutive days the goal was met, ending today (or yesterday if today isn't done yet). */
export function currentStreak(data: HydrationData, today: Date) {
  const met = (date: Date) => {
    const key = dateKey(date);
    return totalMl(data.log[key]) >= goalForDay(data, key);
  };
  let day = met(today) ? today : addDays(today, -1);
  let streak = 0;
  while (met(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** Times of day (minutes after midnight) to remind, from wake time up to sleep time. */
export function reminderTimes(settings: Settings) {
  const { wakeMinutes, intervalMinutes } = settings;
  let sleep = settings.sleepMinutes;
  if (sleep <= wakeMinutes) sleep += 24 * 60; // sleeping after midnight
  const times: number[] = [];
  for (let t = wakeMinutes; t <= sleep && times.length < MAX_DAILY_REMINDERS; t += intervalMinutes) {
    times.push(t % (24 * 60));
  }
  return times;
}

export function nextReminder(settings: Settings, now: Date) {
  if (!settings.remindersEnabled) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const times = reminderTimes(settings).sort((a, b) => a - b);
  return times.find((t) => t > nowMinutes) ?? times[0] ?? null;
}

export function formatMinutes(minutes: number) {
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return formatTime(date);
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatMl(ml: number) {
  return ml >= 1000 ? `${parseFloat((ml / 1000).toFixed(2))} L` : `${ml} ml`;
}
