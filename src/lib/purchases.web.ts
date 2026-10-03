// In-app purchases aren't offered on the web build.
export type PremiumPlan = {
  id: string;
  title: string;
  price: string;
  detail: string | null;
  pkg: unknown;
};

export const purchasesAvailable = false;

export function subscribeToPremium(onChange: (premium: boolean | null) => void) {
  onChange(false);
  return () => {};
}

export async function getPlans(): Promise<PremiumPlan[]> {
  return [];
}

export async function buyPlan(_plan: PremiumPlan) {
  return false;
}

export async function restorePurchases() {
  return false;
}
