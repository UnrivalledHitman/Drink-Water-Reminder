# Drink Water Reminder

A mobile app (Android and iOS) that reminds you to drink water and tracks your daily hydration goal. Built with [Expo](https://expo.dev) and React Native.

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

## Project layout

- `src/app/` — screens (file-based routing with Expo Router)
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
