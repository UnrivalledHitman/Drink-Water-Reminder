// In-app purchases through RevenueCat. In Expo Go the SDK runs in a mock
// "Preview API Mode"; real purchases need a development or store build.
import Purchases, { type CustomerInfo, PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';

import { PREMIUM_ENTITLEMENT, REVENUECAT_API_KEY } from '@/constants/monetization';

export type PremiumPlan = {
  id: string;
  title: string;
  price: string;
  /** e.g. "₹83/month" for a yearly plan */
  detail: string | null;
  pkg: unknown;
};

/** False until RevenueCat keys are set (see .env.example). */
export const purchasesAvailable = REVENUECAT_API_KEY !== '';

let configured = false;

function configure() {
  if (!purchasesAvailable) return false;
  if (!configured) {
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    configured = true;
  }
  return true;
}

const hasPremium = (info: CustomerInfo) => PREMIUM_ENTITLEMENT in info.entitlements.active;

/**
 * Reports whether the user has Premium now and whenever it changes (purchase,
 * renewal, expiry). Calls back with null if it can't be determined yet.
 */
export function subscribeToPremium(onChange: (premium: boolean | null) => void) {
  if (!configure()) {
    onChange(false);
    return () => {};
  }
  const listener = (info: CustomerInfo) => onChange(hasPremium(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  Purchases.getCustomerInfo().then(listener, (error) => {
    console.warn('Could not check Premium status', error);
    onChange(null);
  });
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

const PLAN_TITLES: Partial<Record<PACKAGE_TYPE, string>> = {
  [PACKAGE_TYPE.ANNUAL]: 'Yearly',
  [PACKAGE_TYPE.SIX_MONTH]: '6 months',
  [PACKAGE_TYPE.THREE_MONTH]: '3 months',
  [PACKAGE_TYPE.MONTHLY]: 'Monthly',
  [PACKAGE_TYPE.WEEKLY]: 'Weekly',
  [PACKAGE_TYPE.LIFETIME]: 'Lifetime',
};

/** The plans in the current RevenueCat offering, as set up in the RevenueCat dashboard. */
export async function getPlans(): Promise<PremiumPlan[]> {
  if (!configure()) return [];
  const offerings = await Purchases.getOfferings();
  return (offerings.current?.availablePackages ?? []).map((pkg) => ({
    id: pkg.identifier,
    title: PLAN_TITLES[pkg.packageType] ?? pkg.product.title,
    price: pkg.product.priceString,
    detail:
      pkg.packageType === PACKAGE_TYPE.LIFETIME
        ? 'One-time purchase'
        : pkg.packageType !== PACKAGE_TYPE.MONTHLY && pkg.product.pricePerMonthString
          ? `${pkg.product.pricePerMonthString}/month`
          : null,
    pkg,
  }));
}

/** Resolves to true when bought, false when the user cancelled; throws on errors. */
export async function buyPlan(plan: PremiumPlan) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg as PurchasesPackage);
    return hasPremium(customerInfo);
  } catch (error) {
    if ((error as { userCancelled?: boolean }).userCancelled) return false;
    throw error;
  }
}

/** Resolves to whether a previous purchase restored Premium. */
export async function restorePurchases() {
  if (!configure()) return false;
  return hasPremium(await Purchases.restorePurchases());
}
