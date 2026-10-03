// AdMob isn't available on the web; the web build shows an ad placeholder in development.
export const adsModule = null;

export async function startAds() {
  return false;
}

export async function adPrivacyOptionsRequired() {
  return false;
}

export async function showAdPrivacyOptions() {}
