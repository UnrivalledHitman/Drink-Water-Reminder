import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Screen } from '@/components/controls';
import { ProgressRing } from '@/components/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  dateKey,
  formatMl,
  formatTime,
  formatWhen,
  PERIOD_INFO,
  periodDates,
  periodGoal,
  periodTotal,
  remindersPausedUntil,
  startOfDay,
  totalMl,
  upcomingReminders,
} from '@/lib/hydration';
import { remindersSupported } from '@/lib/reminders';
import { useHydration } from '@/state/hydration-store';

const CUP_LABELS = ['Small glass', 'Glass', 'Bottle'];
const MAX_CUSTOM_ML = 2000;

export default function TodayScreen() {
  const { data, now, addIntake, removeEntry } = useHydration();
  const theme = useTheme();
  const [custom, setCustom] = useState('');

  const { settings } = data;
  const period = settings.goalPeriod;
  const info = PERIOD_INFO[period];
  const today = dateKey(now);
  const entries = data.log[today] ?? [];
  const drankToday = totalMl(entries);
  const drank = periodTotal(data, now, period);
  const goal = periodGoal(data, now, period);
  const remaining = Math.max(0, goal - drank);
  const daysLeft = periodDates(now, period).filter((day) => day >= startOfDay(now)).length;
  const pausedUntil = remindersPausedUntil(data, now);
  const next = upcomingReminders(settings, now, pausedUntil, 1)[0];

  let status = `${formatMl(remaining)} to go`;
  if (remaining === 0) status = `${info.label} goal reached — nice work! 🎉`;
  else if (daysLeft > 1) status += ` · about ${formatMl(remaining / daysLeft)} a day`;

  const customMl = Number.parseInt(custom, 10);
  const customValid = customMl > 0 && customMl <= MAX_CUSTOM_ML;
  const addCustom = () => {
    if (!customValid) return;
    addIntake(customMl);
    setCustom('');
  };

  return (
    <Screen title="Today">
      <View style={styles.hero}>
        <ProgressRing progress={goal > 0 ? drank / goal : 0}>
          <ThemedText type="subtitle">{formatMl(drank)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            of {formatMl(goal)} {info.current}
          </ThemedText>
        </ProgressRing>
        <ThemedText style={styles.status}>{status}</ThemedText>
        {period !== 'day' && (
          <ThemedText type="small" themeColor="textSecondary">
            Today: {formatMl(drankToday)}
          </ThemedText>
        )}
        {remindersSupported &&
          (!settings.remindersEnabled ? (
            <Button label="Turn on reminders" variant="soft" onPress={() => router.navigate('/settings')} />
          ) : (
            next && (
              <ThemedText type="small" themeColor="textSecondary">
                {pausedUntil ? 'Reminders paused until' : 'Next reminder'} {formatWhen(next, now)}
              </ThemedText>
            )
          ))}
      </View>

      <Card title="Add a drink">
        <View style={styles.cups}>
          {data.settings.cupSizes.map((ml, index) => (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`Add ${ml} ml`}
              onPress={() => addIntake(ml)}
              style={({ pressed }) => [
                styles.cup,
                { backgroundColor: theme.tintSoft, opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                +{ml} ml
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {CUP_LABELS[index] ?? 'Cup'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.customRow}>
          <TextInput
            value={custom}
            onChangeText={(text) => setCustom(text.replace(/[^0-9]/g, ''))}
            onSubmitEditing={addCustom}
            placeholder="Custom amount (ml)"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={4}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
          />
          <Button label="Add" onPress={addCustom} disabled={!customValid} />
        </View>
      </Card>

      <Card title={`Today's log · ${entries.length} ${entries.length === 1 ? 'drink' : 'drinks'}`}>
        {entries.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Nothing yet. Tap a glass above when you drink.
          </ThemedText>
        ) : (
          [...entries].reverse().map((entry) => (
            <View key={entry.id} style={styles.entry}>
              <ThemedText>{formatTime(new Date(entry.at))}</ThemedText>
              <View style={styles.entryRight}>
                <ThemedText type="smallBold">{entry.ml} ml</ThemedText>
                <Button
                  label="Remove"
                  variant="plain"
                  accessibilityLabel={`Remove ${entry.ml} ml from ${formatTime(new Date(entry.at))}`}
                  onPress={() => removeEntry(today, entry.id)}
                />
              </View>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  status: {
    marginTop: Spacing.two,
  },
  cups: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cup: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  customRow: {
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
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
