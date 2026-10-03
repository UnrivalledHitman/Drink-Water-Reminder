import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/controls';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/constants/monetization';
import { useTheme } from '@/hooks/use-theme';
import { buyPlan, getPlans, purchasesAvailable, restorePurchases, type PremiumPlan } from '@/lib/purchases';

const BENEFITS = [
  ['🚫', 'No ads'],
  ['📅', 'Weekly and monthly goals'],
  ['📈', 'Full history: 30-day stats and past weeks and months'],
  ['💙', 'Support an independent developer'],
];

type Props = { visible: boolean; reason?: string; onClose: () => void };

export function Paywall({ visible, reason, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<PremiumPlan[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible || !purchasesAvailable) return;
    getPlans().then(
      (loaded) => {
        setPlans(loaded);
        setLoadError(false);
        // Preselect the yearly plan, the usual best value.
        setSelected((current) => current ?? (loaded.find((p) => p.title === 'Yearly') ?? loaded[0])?.id ?? null);
      },
      (error) => {
        console.warn('Could not load plans', error);
        setLoadError(true);
      }
    );
  }, [visible]);

  const plan = plans?.find((p) => p.id === selected) ?? null;

  const finish = (title: string, message: string) => {
    onClose();
    Alert.alert(title, message);
  };

  const buy = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      if (await buyPlan(plan)) finish('Welcome to Premium 💧', 'Thanks for your support! Ads are gone and everything is unlocked.');
    } catch (error) {
      Alert.alert('Purchase failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      if (await restorePurchases()) finish('Premium restored', 'Your purchase has been restored.');
      else Alert.alert('Nothing to restore', 'No Premium purchase was found for this store account.');
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <View style={styles.header}>
          <Button label="Close" variant="plain" onPress={onClose} />
        </View>

        <ThemedText style={styles.drop}>💧</ThemedText>
        <ThemedText type="subtitle" style={styles.center}>
          Go Premium
        </ThemedText>
        {reason && (
          <ThemedText themeColor="textSecondary" style={styles.center}>
            {reason}
          </ThemedText>
        )}

        <View style={styles.benefits}>
          {BENEFITS.map(([icon, text]) => (
            <View key={text} style={styles.benefit}>
              <ThemedText>{icon}</ThemedText>
              <ThemedText style={styles.benefitText}>{text}</ThemedText>
            </View>
          ))}
        </View>

        {!purchasesAvailable ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Purchases aren’t set up in this build yet.
            {__DEV__ && ' Add your RevenueCat keys to .env.local (see .env.example), or use “Simulate Premium” in Settings.'}
          </ThemedText>
        ) : loadError ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Couldn’t load plans. Check your connection and try again.
          </ThemedText>
        ) : plans === null ? (
          <ActivityIndicator color={theme.tint} />
        ) : plans.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            No plans are available right now.
          </ThemedText>
        ) : (
          <View style={styles.plans}>
            {plans.map((p) => {
              const isSelected = p.id === selected;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelected(p.id)}
                  style={[
                    styles.plan,
                    {
                      borderColor: isSelected ? theme.tint : theme.backgroundSelected,
                      backgroundColor: isSelected ? theme.tintSoft : theme.backgroundElement,
                    },
                  ]}>
                  <View>
                    <ThemedText type="smallBold">{p.title}</ThemedText>
                    {p.detail && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {p.detail}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="smallBold">{p.price}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}

        <Button label={busy ? 'Please wait…' : 'Continue'} onPress={buy} disabled={!plan || busy} />
        {purchasesAvailable && (
          <Button label="Restore purchases" variant="plain" onPress={restore} disabled={busy} />
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.legal}>
          Subscriptions renew automatically at the price shown until cancelled. Cancel any time in
          your app store account settings at least 24 hours before the end of the current period.
        </ThemedText>
        <View style={styles.links}>
          {PRIVACY_POLICY_URL !== '' && (
            <Button label="Privacy policy" variant="plain" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
          )}
          {TERMS_URL !== '' && (
            <Button label="Terms of use" variant="plain" onPress={() => Linking.openURL(TERMS_URL)} />
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'flex-end',
    paddingTop: Spacing.two,
  },
  drop: {
    fontSize: 56,
    lineHeight: 68,
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  benefits: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  benefit: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
  },
  plans: {
    gap: Spacing.two,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  legal: {
    textAlign: 'center',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
});
