import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { reminderTimes, type Settings } from '@/lib/hydration';

const CHANNEL_ID = 'water-reminders';
const CATEGORY_ID = 'water-reminder';
const SNOOZE_ID = 'snooze';
const SNOOZE_MINUTES = 10;

export const ACTION_LOG_DRINK = 'log-drink';
export const ACTION_SNOOZE = 'snooze';

export type ReminderAction = typeof ACTION_LOG_DRINK | typeof ACTION_SNOOZE | 'open';

const MESSAGES = [
  'Time for a glass of water.',
  'Stay hydrated — take a few sips.',
  'Your body will thank you. Drink up!',
  'Quick water break?',
  'Keep your streak going — have some water.',
];

export const remindersSupported = true;

/** Show reminders even while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let setupDone: Promise<void> | null = null;

function setup() {
  setupDone ??= (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Water reminders',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 500, 250, 500],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
    // Both actions open the app so they work even if it was closed.
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      {
        identifier: ACTION_LOG_DRINK,
        buttonTitle: 'I drank a glass',
        options: { opensAppToForeground: true },
      },
      {
        identifier: ACTION_SNOOZE,
        buttonTitle: `Snooze ${SNOOZE_MINUTES} min`,
        options: { opensAppToForeground: true },
      },
    ]);
  })();
  return setupDone;
}

export async function hasPermission() {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

export async function requestPermission() {
  await setup();
  if (await hasPermission()) return true;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

function content(index: number): Notifications.NotificationContentInput {
  return {
    title: 'Drink water 💧',
    body: MESSAGES[index % MESSAGES.length],
    sound: 'default',
    categoryIdentifier: CATEGORY_ID,
    priority: Notifications.AndroidNotificationPriority.MAX,
  };
}

/** Replace all scheduled reminders with ones matching the settings. */
export async function syncReminders(settings: Settings) {
  await setup();
  // Keep a pending snooze; it may have been scheduled moments ago.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.identifier !== SNOOZE_ID)
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier))
  );
  if (!settings.remindersEnabled || !(await hasPermission())) return;

  const times = reminderTimes(settings);
  await Promise.all(
    times.map((minutes, index) =>
      Notifications.scheduleNotificationAsync({
        content: content(index),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: Math.floor(minutes / 60),
          minute: minutes % 60,
          channelId: CHANNEL_ID,
        },
      })
    )
  );
}

export async function snooze() {
  await setup();
  await Notifications.scheduleNotificationAsync({
    identifier: SNOOZE_ID,
    content: content(0),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SNOOZE_MINUTES * 60,
      channelId: CHANNEL_ID,
    },
  });
}

export async function sendTestReminder() {
  if (!(await requestPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: content(0),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}

const handled = new Set<string>();

/**
 * Calls `onAction` when the user taps a reminder or one of its buttons,
 * including the tap that launched the app.
 */
export function subscribeToReminderActions(onAction: (action: ReminderAction) => void) {
  const handle = (response: Notifications.NotificationResponse) => {
    const key = `${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
    if (handled.has(key)) return;
    handled.add(key);
    Notifications.clearLastNotificationResponseAsync();
    Notifications.dismissNotificationAsync(response.notification.request.identifier);

    if (response.actionIdentifier === ACTION_LOG_DRINK) onAction(ACTION_LOG_DRINK);
    else if (response.actionIdentifier === ACTION_SNOOZE) onAction(ACTION_SNOOZE);
    else onAction('open');
  };

  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handle(response);
  });
  return () => subscription.remove();
}
