# Drink Water Reminder

A mobile app (Android and iOS) that reminds you to drink water and tracks your daily hydration goal. Built with [Expo](https://expo.dev) and React Native.

## Features

- **Daily, weekly, or monthly goal**: set it directly or calculate it from your weight (about 35 ml per kg a day). Weeks start on Monday; months follow the calendar.
- **Reminders**: notifications every 30 min to 2 h between a start and end time, even when the app is closed. They pause once the goal for the current day/week/month is reached and resume when the next one starts. Each reminder has **I drank a glass** and **Snooze 10 min** buttons.
- **Quick logging**: one-tap small glass / glass / bottle (sizes adjustable) or a custom amount, with a progress ring for the current period.
- **History**: last-7-days chart, streak (in days, weeks, or months), 30-day average, and recent periods.

Reminders are scheduled up to two weeks ahead (about four days on iOS, which allows only 64 pending notifications). They're topped up every time the app is opened, and by a background task (`src/lib/reminder-refresh.ts`) that the OS runs every few hours while reminders are on. The OS won't run it if the app was force-quit (swiped away on iOS, "Force stop" on Android) or background activity is turned off, so reminders can still run out in those cases.

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

## Free and Premium

| | Free | Premium |
|---|---|---|
| Daily goal, reminders, logging, streak | ✓ | ✓ |
| History | Last 7 days | 30-day stats, past weeks and months |
| Weekly and monthly goals | — | ✓ |
| Ads | Banner on the Today screen | None |

Ads use Google AdMob (`react-native-google-mobile-ads`); purchases use RevenueCat (`react-native-purchases`). Neither works in Expo Go (ads show a placeholder there), so test them in a development build (`npx eas-cli@latest build --profile development`). In development builds, **Settings → Developer → Simulate Premium** unlocks Premium without buying it.

To set up for release:

1. **AdMob**: create the app in [AdMob](https://admob.google.com), then replace the sample `androidAppId` / `iosAppId` in `app.json` (they're Google's test IDs) and set the banner ad unit IDs in `.env.local`. Set up the GDPR consent message (and optionally the iOS ATT message) under **Privacy & messaging**; the app shows it automatically.
2. **Products**: create the subscriptions (e.g. monthly, yearly) and/or a lifetime purchase in Google Play Console and App Store Connect.
3. **RevenueCat**: connect both stores, create an entitlement named `premium`, attach the products, and add them to the **current offering**. Put the public SDK keys in `.env.local`.
4. Add your privacy policy and terms URLs to `.env.local`; both stores require them for subscriptions.

See `.env.example` for all settings.

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
