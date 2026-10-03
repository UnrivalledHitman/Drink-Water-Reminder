export type GoalPeriod = 'day' | 'week' | 'month';

export type Goal = {
  period: GoalPeriod;
  ml: number;
};

export type Settings = {
  /** Amount to drink in each goal period */
  goalMl: number;
  goalPeriod: GoalPeriod;
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
  goalOnDay: Record<string, Goal>;
};

export const DEFAULT_SETTINGS: Settings = {
  goalMl: 2000,
  goalPeriod: 'day',
  weightKg: null,
  wakeMinutes: 7 * 60,
  sleepMinutes: 22 * 60,
  intervalMinutes: 60,
  remindersEnabled: false,
  cupSizes: [150, 250, 500],
};

export const GOAL_PERIODS: GoalPeriod[] = ['day', 'week', 'month'];

export const PERIOD_INFO: Record<
  GoalPeriod,
  { label: string; noun: string; current: string; step: number; min: number; max: number; typicalDays: number }
> = {
  day: { label: 'Daily', noun: 'day', current: 'today', step: 100, min: 500, max: 6000, typicalDays: 1 },
  week: { label: 'Weekly', noun: 'week', current: 'this week', step: 500, min: 3500, max: 42000, typicalDays: 7 },
  month: { label: 'Monthly', noun: 'month', current: 'this month', step: 1000, min: 15000, max: 180000, typicalDays: 30 },
};

export const REMINDER_INTERVALS = [30, 45, 60, 90, 120];
/** How far ahead reminders are scheduled; the app tops them up whenever it's opened. */
export const REMINDER_WINDOW_DAYS = 14;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampGoal(ml: number, period: GoalPeriod) {
  const { min, max } = PERIOD_INFO[period];
  return clamp(ml, min, max);
}

/** Converts a goal to another period, e.g. 2 L a day → 14 L a week. */
export function convertGoal(ml: number, from: GoalPeriod, to: GoalPeriod) {
  if (from === to) return ml;
  const perDay = ml / PERIOD_INFO[from].typicalDays;
  const { step, typicalDays } = PERIOD_INFO[to];
  return clampGoal(Math.round((perDay * typicalDays) / step) * step, to);
}

/** About 35 ml per kg of body weight a day, rounded to the nearest 50 ml. */
export function goalFromWeight(weightKg: number, period: GoalPeriod = 'day') {
  const daily = clampGoal(Math.round((weightKg * 35) / 50) * 50, 'day');
  return convertGoal(daily, 'day', period);
}

// ---- Dates and periods ----

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

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Days start at midnight, weeks on Monday, months on the 1st. */
export function periodStart(date: Date, period: GoalPeriod) {
  if (period === 'week') return addDays(startOfDay(date), -((date.getDay() + 6) % 7));
  if (period === 'month') return new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfDay(date);
}

/** First moment of the next period. */
export function periodEnd(date: Date, period: GoalPeriod) {
  const start = periodStart(date, period);
  if (period === 'week') return addDays(start, 7);
  if (period === 'month') return new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return addDays(start, 1);
}

export function periodDates(date: Date, period: GoalPeriod) {
  const dates: Date[] = [];
  const end = periodEnd(date, period);
  for (let day = periodStart(date, period); day < end; day = addDays(day, 1)) dates.push(day);
  return dates;
}

// ---- Totals and goals ----

export function totalMl(entries: Entry[] | undefined) {
  return (entries ?? []).reduce((sum, entry) => sum + entry.ml, 0);
}

export function periodTotal(data: HydrationData, date: Date, period: GoalPeriod) {
  return periodDates(date, period).reduce((sum, day) => sum + totalMl(data.log[dateKey(day)]), 0);
}

/** The goal for the period containing `date`, as it was set during that period. */
export function periodGoal(data: HydrationData, date: Date, period: GoalPeriod) {
  const days = periodDates(date, period).reverse();
  for (const day of days) {
    const goal = data.goalOnDay[dateKey(day)];
    if (goal?.period === period) return goal.ml;
  }
  return convertGoal(data.settings.goalMl, data.settings.goalPeriod, period);
}

export function periodGoalMet(data: HydrationData, date: Date, period = data.settings.goalPeriod) {
  return periodTotal(data, date, period) >= periodGoal(data, date, period);
}

/** The current goal spread evenly over the days of its period, for daily charts. */
export function dailyTarget(data: HydrationData, date: Date) {
  const period = data.settings.goalPeriod;
  return periodGoal(data, date, period) / periodDates(date, period).length;
}

/** Consecutive goal periods met, ending with the current one (or the previous one if it isn't done yet). */
export function currentStreak(data: HydrationData, today: Date) {
  const period = data.settings.goalPeriod;
  const previous = (date: Date) => addDays(periodStart(date, period), -1);
  let date = periodGoalMet(data, today) ? today : previous(today);
  let streak = 0;
  while (streak < 1000 && periodGoalMet(data, date)) {
    streak++;
    date = previous(date);
  }
  return streak;
}

// ---- Reminders ----

/** When reminders resume if this period's goal is already met, otherwise null. */
export function remindersPausedUntil(data: HydrationData, now: Date) {
  return periodGoalMet(data, now) ? periodEnd(now, data.settings.goalPeriod) : null;
}

/** Minutes after each day's midnight to remind, from wake time up to sleep time (may pass 24:00). */
export function reminderOffsets(settings: Settings) {
  const { wakeMinutes, intervalMinutes } = settings;
  let sleep = settings.sleepMinutes;
  if (sleep <= wakeMinutes) sleep += 24 * 60; // sleeping after midnight
  const offsets: number[] = [];
  for (let t = wakeMinutes; t <= sleep; t += intervalMinutes) offsets.push(t);
  return offsets;
}

/** The next reminder times, skipping any while reminders are paused. */
export function upcomingReminders(settings: Settings, now: Date, pausedUntil: Date | null, limit: number) {
  if (!settings.remindersEnabled) return [];
  const from = pausedUntil && pausedUntil > now ? pausedUntil : now;
  const offsets = reminderOffsets(settings);
  const times: Date[] = [];
  // Start a day early to catch the after-midnight end of yesterday's window.
  for (let d = -1; d <= REMINDER_WINDOW_DAYS; d++) {
    const day = addDays(startOfDay(from), d);
    for (const offset of offsets) {
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, offset);
      if (at <= from) continue;
      times.push(at);
      if (times.length >= limit) return times;
    }
  }
  return times;
}

// ---- Formatting ----

export function formatMinutes(minutes: number) {
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return formatTime(date);
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "today at 4:00 PM", "tomorrow at 7:00 AM", or "Mon, Oct 5 at 7:00 AM" */
export function formatWhen(date: Date, now: Date) {
  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);
  const day =
    days === 0
      ? 'today'
      : days === 1
        ? 'tomorrow'
        : date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} at ${formatTime(date)}`;
}

export function formatMl(ml: number) {
  return ml >= 1000 ? `${parseFloat((ml / 1000).toFixed(2))} L` : `${Math.round(ml)} ml`;
}
