import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card } from '@/components/controls';
import { ThemedText } from '@/components/themed-text';
import { formatWhen } from '@/lib/hydration';
import { lastBackgroundRefresh, runBackgroundRefreshForTesting } from '@/lib/reminder-refresh';
import { pendingReminderCount } from '@/lib/reminders';

function loadInfo() {
  return Promise.all([lastBackgroundRefresh(), pendingReminderCount()]);
}

/**
 * Development builds only: shows whether the background refresh has run and
 * lets you trigger it on demand. Hidden in release builds.
 */
export function BackgroundRefreshDebug({ remindersEnabled }: { remindersEnabled: boolean }) {
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  const showInfo = ([last, count]: [Date | null, number]) => {
    setLastRun(last);
    setPending(count);
  };

  useEffect(() => {
    loadInfo().then(showInfo, () => {});
  }, [remindersEnabled]);

  const run = async () => {
    setRunning(true);
    try {
      const ranAt = await runBackgroundRefreshForTesting();
      showInfo(await loadInfo());
      if (ranAt) {
        Alert.alert('Background refresh ran', `Finished ${formatWhen(ranAt, new Date())}.`);
      } else {
        Alert.alert(
          'Background refresh didn’t run',
          'It didn’t finish within 10 seconds. Check the Metro logs for errors.'
        );
      }
    } catch (error) {
      Alert.alert('Background refresh failed', String(error));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card title="Developer">
      <ThemedText type="small" themeColor="textSecondary">
        Last background refresh: {lastRun ? formatWhen(lastRun, new Date()) : 'never'}
        {'\n'}Pending reminders: {pending ?? '…'}
      </ThemedText>
      <Button
        label={running ? 'Running…' : 'Run background refresh now'}
        variant="soft"
        disabled={running || !remindersEnabled}
        onPress={run}
      />
      {!remindersEnabled && (
        <ThemedText type="small" themeColor="textSecondary">
          Turn reminders on first; the background task is only registered while they’re on.
        </ThemedText>
      )}
    </Card>
  );
}
