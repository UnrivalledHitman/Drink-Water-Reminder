// Scheduled notifications aren't available on the web; this keeps the
// web build (used for quick UI previews) working with reminders turned off.
import type { Settings } from '@/lib/hydration';

export const ACTION_LOG_DRINK = 'log-drink';
export const ACTION_SNOOZE = 'snooze';

export type ReminderAction = typeof ACTION_LOG_DRINK | typeof ACTION_SNOOZE | 'open';

export const remindersSupported = false;

export async function hasPermission() {
  return false;
}

export async function requestPermission() {
  return false;
}

export async function syncReminders(_settings: Settings, _pausedUntil: Date | null) {}

export async function pendingReminderCount() {
  return 0;
}

export async function snooze() {}

export async function sendTestReminder() {
  return false;
}

export function subscribeToReminderActions(_onAction: (action: ReminderAction) => void) {
  return () => {};
}
