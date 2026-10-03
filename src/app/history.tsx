import { StyleSheet, View } from 'react-native';

import { Button, Card, Screen } from '@/components/controls';
import { ThemedText } from '@/components/themed-text';
import { FREE_HISTORY_DAYS } from '@/constants/monetization';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addDays,
  currentStreak,
  dailyTarget,
  dateKey,
  formatMl,
  type GoalPeriod,
  PERIOD_INFO,
  periodGoal,
  periodStart,
  periodTotal,
  totalMl,
} from '@/lib/hydration';
import { useHydration } from '@/state/hydration-store';
import { usePremium } from '@/state/premium-store';

const CHART_HEIGHT = 140;
const RECENT_PERIODS: Record<GoalPeriod, number> = { day: 30, week: 8, month: 6 };

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function periodLabel(start: Date, period: GoalPeriod) {
  if (period === 'day') {
    return start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  if (period === 'month') return start.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const end = addDays(start, 6);
  const short = (date: Date) => date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${short(start)} – ${short(end)}`;
}

export default function HistoryScreen() {
  const { data, now } = useHydration();
  const { isPremium, showPaywall } = usePremium();
  // Free users see the last week; Premium sees 30 days and past weeks/months.
  const statDays = isPremium ? 30 : FREE_HISTORY_DAYS;
  const theme = useTheme();
  const period = data.settings.goalPeriod;
  const info = PERIOD_INFO[period];

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(now, i - 6);
    return { date, key: dateKey(date), total: totalMl(data.log[dateKey(date)]), target: dailyTarget(data, date) };
  });

  const recentDays = Array.from({ length: statDays }, (_, i) => totalMl(data.log[dateKey(addDays(now, -i))]));
  const tracked = recentDays.filter((total) => total > 0);
  const average = tracked.length ? Math.round(tracked.reduce((a, b) => a + b, 0) / tracked.length) : 0;

  // Most recent first: this period, then the ones before it.
  const periods: { start: Date; total: number; goal: number }[] = [];
  for (let date = now; periods.length < RECENT_PERIODS[period]; date = addDays(periodStart(date, period), -1)) {
    periods.push({
      start: periodStart(date, period),
      total: periodTotal(data, date, period),
      goal: periodGoal(data, date, period),
    });
  }
  const current = periods[0];
  const goalDays = periods.slice(0, statDays).filter((p) => p.total >= p.goal).length;
  // Skip empty periods, but always show the current week or month.
  const shownPeriods = periods.filter((p) => p.total > 0 || (p === current && period !== 'day'));

  const streak = currentStreak(data, now);
  const chartMax = Math.max(1, ...week.map((day) => Math.max(day.total, day.target)));

  return (
    <Screen title="History">
      <View style={styles.stats}>
        <Stat label={`${capitalize(info.noun)} streak`} value={`${streak} 🔥`} />
        <Stat label="Avg / day" value={formatMl(average)} />
        {period === 'day' ? (
          <Stat label="Goal days" value={`${goalDays}/${statDays}`} />
        ) : (
          <Stat
            label={capitalize(info.current)}
            value={`${Math.min(100, Math.round((current.total / current.goal) * 100))}%`}
          />
        )}
      </View>

      <Card title="Last 7 days">
        <View style={[styles.chart, { height: CHART_HEIGHT + 24 }]}>
          {week.map((day) => {
            const met = day.total >= day.target;
            return (
              <View key={day.key} style={styles.barColumn}>
                <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                  {/* daily target marker */}
                  <View
                    style={[
                      styles.goalLine,
                      { bottom: (day.target / chartMax) * CHART_HEIGHT, backgroundColor: theme.textSecondary },
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
          {period === 'day'
            ? 'Green bars reached the goal. The grey line marks each day’s goal.'
            : `The grey line is your ${info.label.toLowerCase()} goal spread evenly over the ${info.noun}.`}
        </ThemedText>
      </Card>

      {!isPremium ? (
        <Card title="Full history">
          <ThemedText type="small" themeColor="textSecondary">
            See 30-day stats, every day’s total, and how your past weeks and months went with Premium.
          </ThemedText>
          <Button
            label="Unlock full history"
            variant="soft"
            onPress={() => showPaywall('Full history is part of Premium.')}
          />
        </Card>
      ) : (
        <Card title={period === 'day' ? 'Past 30 days' : `Recent ${info.noun}s`}>
          {shownPeriods.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Your daily totals will show up here.
            </ThemedText>
          ) : (
            shownPeriods.map((p) => (
              <View key={p.start.getTime()} style={styles.dayRow}>
                <ThemedText>
                  {periodLabel(p.start, period)}
                  {p === current && period !== 'day' ? ' (now)' : ''}
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: p.total >= p.goal ? theme.success : theme.text }}>
                  {formatMl(p.total)} / {formatMl(p.goal)}
                </ThemedText>
              </View>
            ))
          )}
        </Card>
      )}
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
