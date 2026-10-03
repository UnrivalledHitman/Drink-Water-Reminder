import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { convertGoal } from '@/lib/hydration';
import { ACTION_LOG_DRINK, ACTION_SNOOZE, snooze, subscribeToReminderActions } from '@/lib/reminders';
import { HydrationProvider, useHydration } from '@/state/hydration-store';
import { PremiumProvider, usePremium } from '@/state/premium-store';

SplashScreen.preventAutoHideAsync();

const hideSplash = () => SplashScreen.hideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PremiumProvider>
        <HydrationProvider onLoaded={hideSplash}>
          <ReminderActions />
          <PremiumGoalGuard />
          <AppTabs />
        </HydrationProvider>
      </PremiumProvider>
    </ThemeProvider>
  );
}

/** Handles the buttons on a reminder notification. */
function ReminderActions() {
  const { data, addIntake } = useHydration();
  const latest = useRef({ addIntake, glass: data.settings.cupSizes[1] });
  useEffect(() => {
    latest.current = { addIntake, glass: data.settings.cupSizes[1] };
  });

  useEffect(
    () =>
      subscribeToReminderActions((action) => {
        if (action === ACTION_LOG_DRINK) latest.current.addIntake(latest.current.glass);
        else if (action === ACTION_SNOOZE) snooze();
      }),
    []
  );

  return null;
}

/** Weekly and monthly goals are Premium; if Premium ends, switch back to the matching daily goal. */
function PremiumGoalGuard() {
  const { status } = usePremium();
  const { data, updateSettings } = useHydration();
  const { goalPeriod, goalMl } = data.settings;

  useEffect(() => {
    if (status === 'free' && goalPeriod !== 'day') {
      updateSettings({ goalPeriod: 'day', goalMl: convertGoal(goalMl, goalPeriod, 'day') });
    }
  }, [status, goalPeriod, goalMl, updateSettings]);

  return null;
}
