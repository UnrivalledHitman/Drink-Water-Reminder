import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Expo Go doesn't include the AdMob native module; ads need a development build. */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type AdsModule = typeof import('react-native-google-mobile-ads');

/** The AdMob library, or null where it can't load (Expo Go). */
export const adsModule: AdsModule | null = isExpoGo
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('react-native-google-mobile-ads') as AdsModule);

let started: Promise<boolean> | null = null;

/**
 * Asks for ad consent where the law requires it (EU/UK, and Apple's tracking
 * prompt on iOS if set up in AdMob), then starts the ads SDK. Resolves to
 * whether ads may be requested. Safe to call repeatedly.
 */
export function startAds() {
  started ??= (async () => {
    if (!adsModule) return false;
    const { AdsConsent, default: mobileAds } = adsModule;
    let canRequestAds: boolean;
    try {
      ({ canRequestAds } = await AdsConsent.gatherConsent());
    } catch (error) {
      // Fall back to the consent given in an earlier session.
      console.warn('Ad consent failed', error);
      canRequestAds = (await AdsConsent.getConsentInfo().catch(() => null))?.canRequestAds ?? false;
    }
    if (canRequestAds) await mobileAds().initialize();
    return canRequestAds;
  })().catch((error) => {
    console.warn('Could not start ads', error);
    started = null;
    return false;
  });
  return started;
}

/** Whether users in this region must be offered a way to change their ad consent. */
export async function adPrivacyOptionsRequired() {
  if (!adsModule) return false;
  const { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } = adsModule;
  const info = await AdsConsent.getConsentInfo();
  return info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
}

export async function showAdPrivacyOptions() {
  await adsModule?.AdsConsent.showPrivacyOptionsForm();
}
