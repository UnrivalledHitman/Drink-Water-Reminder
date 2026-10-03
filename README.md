# Drink Water Reminder

A mobile app (Android and iOS) that reminds you to drink water and tracks your daily hydration goal. Built with [Expo](https://expo.dev) and React Native.

## Features

- **Daily, weekly, or monthly goal**: set it directly or calculate it from your weight (about 35 ml per kg a day). Weeks start on Monday; months follow the calendar.
- **Reminders**: notifications every 30 min to 2 h between a start and end time, even when the app is closed. They pause once the goal for the current day/week/month is reached and resume when the next one starts. Each reminder has **I drank a glass** and **Snooze 10 min** buttons.
- **Quick logging**: one-tap small glass / glass / bottle (sizes adjustable) or a custom amount, with a progress ring for the current period.
- **History**: last-7-days chart, streak (in days, weeks, or months), 30-day average, and recent periods.

Reminders are scheduled up to two weeks ahead (about four days on iOS, which allows only 64 pending notifications) and topped up every time the app is opened.

All data is stored on the device.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the dev server:

   ```bash
   npx expo start
   ```

   Then scan the QR code with the [Expo Go](https://expo.dev/go) app on your phone, press `a` for an Android emulator, or press `w` for the web.

Reminders need a phone (Android or iOS). The web version is handy for working on the UI, but it can't send notifications.

## Project layout

- `src/app/` — screens (file-based routing with Expo Router)
- `src/lib/` — hydration math (`hydration.ts`) and notification scheduling (`reminders.ts`)
- `src/state/` — app state and on-device storage
- `src/components/` — reusable UI components
- `src/constants/` — theme colors, spacing, fonts
- `src/hooks/` — shared React hooks
- `assets/` — icons, splash screen, images

## Useful commands

```bash
npx expo lint      # lint
npx tsc --noEmit   # typecheck
npx expo-doctor    # check dependency and config issues
```
