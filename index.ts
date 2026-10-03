// Background tasks must be defined before the app renders, including when the
// OS starts the app in the background, so load them ahead of Expo Router.
import '@/lib/reminder-refresh';
import 'expo-router/entry';
