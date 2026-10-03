import { StyleSheet, View } from 'react-native';

import { Card, Screen } from '@/components/controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, currentStreak, dateKey, formatMl, goalForDay, totalMl } from '@/lib/hydration';
import { useHydration } from '@/state/hydration-store';

const CHART_HEIGHT = 140;

export default function HistoryScreen() {
  const { data, now } = useHydration();
  const theme = useTheme();

  const days = (count: number) =>
    Array.from({ length: count }, (_, i) => {
      const date = addDays(now, i - count + 1);
      const key = dateKey(date);
      return { date, key, total: totalMl(data.log[key]), goal: goalForDay(data, key) };
    });

  const week = days(7);
  const month = days(30);
  const tracked = month.filter((day) => day.total > 0);
  const average = tracked.length
    ? Math.round(tracked.reduce((sum, day) => sum + day.total, 0) / tracked.length)
    : 0;
  const goalDays = month.filter((day) => day.total >= day.goal).length;
  const streak = currentStreak(data, now);
  const chartMax = Math.max(...week.map((day) => Math.max(day.total, day.goal)));

  return (
    <Screen title="History">
      <View style={styles.stats}>
        <Stat label="Day streak" value={`${streak} 🔥`} />
        <Stat label="Avg / day" value={formatMl(average)} />
        <Stat label="Goal days" value={`${goalDays}/30`} />
      </View>

      <Card title="Last 7 days">
        <View style={[styles.chart, { height: CHART_HEIGHT + 24 }]}>
          {week.map((day) => {
            const met = day.total >= day.goal;
            return (
              <View key={day.key} style={styles.barColumn}>
                <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                  {/* goal marker */}
                  <View
                    style={[
                      styles.goalLine,
                      { bottom: (day.goal / chartMax) * CHART_HEIGHT, backgroundColor: theme.textSecondary },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(day.total > 0 ? 4 : 0, (day.total / chartMax) * CHART_HEIGHT),
                        backgroundColor: met ? theme.success : theme.tint,
                      },
                    ]}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {day.date.toLocaleDateString([], { weekday: 'narrow' })}
                </ThemedText>
              </View>
            );
          })}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Green bars reached the goal. The grey line marks each day’s goal.
        </ThemedText>
      </Card>

      <Card title="Past 30 days">
        {tracked.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Your daily totals will show up here.
          </ThemedText>
        ) : (
          [...tracked].reverse().map((day) => (
            <View key={day.key} style={styles.dayRow}>
              <ThemedText>
                {day.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: day.total >= day.goal ? theme.success : theme.text }}>
                {formatMl(day.total)} / {formatMl(day.goal)}
              </ThemedText>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    gap: Spacing.one,
    alignItems: 'center',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: Spacing.one,
  },
  goalLine: {
    position: 'absolute',
    left: -2,
    right: -2,
    height: 2,
    opacity: 0.5,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
