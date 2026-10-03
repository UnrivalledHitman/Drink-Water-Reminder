import { useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Button, Card, Chip, controlStyles, Screen, Stepper } from '@/components/controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  clamp,
  formatMinutes,
  formatMl,
  goalFromWeight,
  MAX_GOAL_ML,
  MIN_GOAL_ML,
  REMINDER_INTERVALS,
  reminderTimes,
} from '@/lib/hydration';
import { remindersSupported, requestPermission, sendTestReminder } from '@/lib/reminders';
import { useHydration } from '@/state/hydration-store';

const DAY = 24 * 60;
const TIME_STEP = 30;
const GOAL_STEP = 100;
const CUP_STEP = 50;

function shiftTime(minutes: number, delta: number) {
  return (minutes + delta + DAY) % DAY;
}

function permissionDenied() {
  Alert.alert(
    'Notifications are off',
    'Allow notifications for this app in your phone settings to get water reminders.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open settings', onPress: () => Linking.openSettings() },
    ]
  );
}

export default function SettingsScreen() {
  const { data, updateSettings } = useHydration();
  const { settings } = data;
  const theme = useTheme();
  const [weight, setWeight] = useState(settings.weightKg ? String(settings.weightKg) : '');

  const weightKg = Number.parseInt(weight, 10);
  const weightValid = weightKg >= 20 && weightKg <= 250;
  const reminderCount = reminderTimes(settings).length;

  const toggleReminders = async (on: boolean) => {
    if (on && !(await requestPermission())) {
      permissionDenied();
      return;
    }
    updateSettings({ remindersEnabled: on });
  };

  const testReminder = async () => {
    if (await sendTestReminder()) {
      Alert.alert('Test reminder sent', 'It will arrive in about 5 seconds. Try locking your phone.');
    } else {
      permissionDenied();
    }
  };

  return (
    <Screen title="Settings">
      <Card title="Daily goal">
        <Stepper
          label="Goal"
          value={formatMl(settings.goalMl)}
          onDecrease={() => updateSettings({ goalMl: clamp(settings.goalMl - GOAL_STEP, MIN_GOAL_ML, MAX_GOAL_ML) })}
          onIncrease={() => updateSettings({ goalMl: clamp(settings.goalMl + GOAL_STEP, MIN_GOAL_ML, MAX_GOAL_ML) })}
          canDecrease={settings.goalMl > MIN_GOAL_ML}
          canIncrease={settings.goalMl < MAX_GOAL_ML}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Not sure? A common guide is about 35 ml per kg of body weight. Drink more in hot weather or
          when you exercise.
        </ThemedText>
        <View style={styles.inlineRow}>
          <TextInput
            value={weight}
            onChangeText={(text) => setWeight(text.replace(/[^0-9]/g, ''))}
            placeholder="Your weight (kg)"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            maxLength={3}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
          />
          <Button
            label={weightValid ? `Use ${formatMl(goalFromWeight(weightKg))}` : 'Calculate'}
            variant="soft"
            disabled={!weightValid}
            onPress={() => updateSettings({ weightKg, goalMl: goalFromWeight(weightKg) })}
          />
        </View>
      </Card>

      <Card title="Reminders">
        {remindersSupported ? (
          <>
            <View style={controlStyles.row}>
              <ThemedText>Remind me to drink</ThemedText>
              <Switch
                value={settings.remindersEnabled}
                onValueChange={toggleReminders}
                trackColor={{ true: theme.tint }}
              />
            </View>
            <Stepper
              label="Start"
              value={formatMinutes(settings.wakeMinutes)}
              onDecrease={() => updateSettings({ wakeMinutes: shiftTime(settings.wakeMinutes, -TIME_STEP) })}
              onIncrease={() => updateSettings({ wakeMinutes: shiftTime(settings.wakeMinutes, TIME_STEP) })}
            />
            <Stepper
              label="End"
              value={formatMinutes(settings.sleepMinutes)}
              onDecrease={() => updateSettings({ sleepMinutes: shiftTime(settings.sleepMinutes, -TIME_STEP) })}
              onIncrease={() => updateSettings({ sleepMinutes: shiftTime(settings.sleepMinutes, TIME_STEP) })}
            />
            <ThemedText>Every</ThemedText>
            <View style={styles.chips}>
              {REMINDER_INTERVALS.map((minutes) => (
                <Chip
                  key={minutes}
                  label={minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}
                  selected={settings.intervalMinutes === minutes}
                  onPress={() => updateSettings({ intervalMinutes: minutes })}
                />
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {reminderCount} reminders a day, from {formatMinutes(settings.wakeMinutes)} to{' '}
              {formatMinutes(settings.sleepMinutes)}. Tap “I drank a glass” on a reminder to log{' '}
              {settings.cupSizes[1]} ml.
            </ThemedText>
            <Button label="Send a test reminder" variant="soft" onPress={testReminder} />
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Reminders work in the Android and iOS app. Open this project in Expo Go on your phone to try
            them.
          </ThemedText>
        )}
      </Card>

      <Card title="Quick-add sizes">
        {settings.cupSizes.map((ml, index) => (
          <Stepper
            key={index}
            label={['Small glass', 'Glass', 'Bottle'][index] ?? 'Cup'}
            value={`${ml} ml`}
            canDecrease={ml > CUP_STEP}
            canIncrease={ml < 1500}
            onDecrease={() =>
              updateSettings({ cupSizes: settings.cupSizes.map((s, i) => (i === index ? s - CUP_STEP : s)) })
            }
            onIncrease={() =>
              updateSettings({ cupSizes: settings.cupSizes.map((s, i) => (i === index ? s + CUP_STEP : s)) })
            }
          />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inlineRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
