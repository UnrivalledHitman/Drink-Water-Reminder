import { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { Button, Card } from '@/components/controls';
import { ThemedText } from '@/components/themed-text';
import { MANAGE_SUBSCRIPTIONS_URL } from '@/constants/monetization';
import { adPrivacyOptionsRequired, showAdPrivacyOptions } from '@/lib/ads';
import { purchasesAvailable, restorePurchases } from '@/lib/purchases';
import { usePremium } from '@/state/premium-store';

/** Premium status in Settings: upgrade or restore for free users, manage for subscribers. */
export function PremiumCard() {
  const { status, showPaywall, simulatePremium } = usePremium();
  const [privacyRequired, setPrivacyRequired] = useState(false);

  // In the EU/UK, users must be able to change their ad consent at any time.
  useEffect(() => {
    if (status === 'free') adPrivacyOptionsRequired().then(setPrivacyRequired, () => {});
  }, [status]);

  if (status === 'loading') return null;

  if (status === 'premium') {
    return (
      <Card title="Premium">
        <ThemedText>💧 Premium is active. Thanks for your support!</ThemedText>
        {purchasesAvailable && !simulatePremium && (
          <Button
            label="Manage subscription"
            variant="soft"
            onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL)}
          />
        )}
      </Card>
    );
  }

  const restore = async () => {
    try {
      const restored = await restorePurchases();
      Alert.alert(
        restored ? 'Premium restored' : 'Nothing to restore',
        restored ? 'Your purchase has been restored.' : 'No Premium purchase was found for this store account.'
      );
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Card title="Premium">
      <ThemedText type="small" themeColor="textSecondary">
        Remove ads, set weekly or monthly goals, and see your full history.
      </ThemedText>
      <Button label="Go Premium" onPress={() => showPaywall()} />
      {purchasesAvailable && <Button label="Restore purchases" variant="plain" onPress={restore} />}
      {privacyRequired && (
        <Button
          label="Ad privacy choices"
          variant="plain"
          onPress={() => showAdPrivacyOptions().catch((error) => console.warn('Privacy options failed', error))}
        />
      )}
    </Card>
  );
}
