import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BANNER_AD_UNIT_ID } from '@/constants/monetization';
import { Spacing } from '@/constants/theme';
import { adsModule, startAds } from '@/lib/ads';
import { usePremium } from '@/state/premium-store';

/** A banner ad for free users, with a link to remove ads. Renders nothing for Premium. */
export function AdBanner() {
  const { status, showPaywall } = usePremium();
  const [canShow, setCanShow] = useState(false);
  const [failed, setFailed] = useState(false);
  const free = status === 'free';

  useEffect(() => {
    if (free) startAds().then(setCanShow);
  }, [free]);

  if (!free) return null;

  let ad = null;
  // Never show Google's test ads in a release build.
  const unitId = adsModule && (__DEV__ ? adsModule.TestIds.ADAPTIVE_BANNER : BANNER_AD_UNIT_ID);
  if (unitId && canShow && !failed) ad = <NativeBanner unitId={unitId} onFailed={() => setFailed(true)} />;
  else if (!adsModule && __DEV__) {
    ad = (
      <ThemedView type="backgroundSelected" style={styles.placeholder}>
        <ThemedText type="small" themeColor="textSecondary">
          Ad space · real ads need a development build
        </ThemedText>
      </ThemedView>
    );
  }
  if (!ad) return null;

  return (
    <View style={styles.container}>
      {ad}
      <Button label="Remove ads" variant="plain" onPress={() => showPaywall('Go ad-free with Premium.')} />
    </View>
  );
}

function NativeBanner({ unitId, onFailed }: { unitId: string; onFailed: () => void }) {
  const { BannerAd, BannerAdSize, useForeground } = adsModule!;
  const ref = useRef<InstanceType<typeof BannerAd>>(null);

  // iOS can blank banners while the app is in the background; reload on return.
  useForeground(() => {
    if (Platform.OS === 'ios') ref.current?.load();
  });

  return (
    <BannerAd
      ref={ref}
      unitId={unitId}
      size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
      onAdFailedToLoad={(error) => {
        console.warn('Banner ad failed to load', error);
        onFailed();
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  placeholder: {
    alignSelf: 'stretch',
    height: 60,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
