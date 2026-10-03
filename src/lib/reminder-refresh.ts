// Tops up scheduled reminders in the background so they don't run out when
// the app isn't opened for a while. Imported from the app entry (index.ts) so
// the task is defined even when the OS starts the app without any UI.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { remindersPausedUntil } from '@/lib/hydration';
import { syncReminders } from '@/lib/reminders';
import { loadData } from '@/lib/storage';

const TASK_NAME = 'refresh-water-reminders';
/** The OS decides the exact timing; this is the shortest gap it may use. */
const INTERVAL_MINUTES = 6 * 60;
const LAST_RUN_KEY = 'background-refresh-last-run';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const data = await loadData();
    await syncReminders(data.settings, remindersPausedUntil(data, new Date()));
    await AsyncStorage.setItem(LAST_RUN_KEY, String(Date.now()));
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.warn('Background reminder refresh failed', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Registers the refresh task while reminders are on, and removes it when they're off. */
export async function setBackgroundRefresh(enabled: boolean) {
  const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (enabled && !registered) {
    await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: INTERVAL_MINUTES });
  } else if (!enabled && registered) {
    await BackgroundTask.unregisterTaskAsync(TASK_NAME);
  }
}

/** False when the user or OS has turned off background refresh for the app. */
export async function backgroundRefreshAvailable() {
  return (await BackgroundTask.getStatusAsync()) === BackgroundTask.BackgroundTaskStatus.Available;
}

/** When the background task last finished, or null if it never has. */
export async function lastBackgroundRefresh() {
  const value = await AsyncStorage.getItem(LAST_RUN_KEY);
  return value ? new Date(Number(value)) : null;
}

/**
 * Development builds only: asks the OS to run the background task now, then
 * waits up to 10 seconds for it to finish. Returns when it ran, or null.
 */
export async function runBackgroundRefreshForTesting() {
  const before = (await lastBackgroundRefresh())?.getTime() ?? 0;
  await BackgroundTask.triggerTaskWorkerForTestingAsync();
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const after = await lastBackgroundRefresh();
    if (after && after.getTime() > before) return after;
  }
  return null;
}
