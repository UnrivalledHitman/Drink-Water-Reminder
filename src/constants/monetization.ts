import { Platform } from 'react-native';

// Set these in .env.local (see .env.example). EXPO_PUBLIC_ values are built
// into the app, so only put public keys here, never secret ones.

/** RevenueCat entitlement that unlocks Premium. */
export const PREMIUM_ENTITLEMENT = 'premium';

/** RevenueCat public SDK keys (Project settings → API keys). */
export const REVENUECAT_API_KEY =
  Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  }) ?? '';

/** AdMob banner ad unit for release builds; development builds always use Google's test ads. */
export const BANNER_AD_UNIT_ID =
  Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
    android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
  }) ?? '';

/** Shown on the paywall; the stores require both for subscriptions. */
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '';
export const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? '';

/** Days of history free users can see. */
export const FREE_HISTORY_DAYS = 7;

export const MANAGE_SUBSCRIPTIONS_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
