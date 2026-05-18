import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

export function configurePurchases(appUserID: string) {
  if (!API_KEY) return;
  Purchases.configure({ apiKey: API_KEY, appUserID });
}

export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo; error: null } | { customerInfo: null; error: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { customerInfo, error: null };
  } catch (e: any) {
    if (e.userCancelled) return { customerInfo: null, error: 'cancelled' };
    return { customerInfo: null, error: e.message ?? 'Erro ao processar compra' };
  }
}

export async function restorePurchases(): Promise<
  { customerInfo: CustomerInfo; error: null } | { customerInfo: null; error: string }
> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { customerInfo, error: null };
  } catch (e: any) {
    return { customerInfo: null, error: e.message ?? 'Erro ao restaurar compra' };
  }
}

export function isSubscriptionActive(customerInfo: CustomerInfo): boolean {
  return typeof customerInfo.entitlements.active['premium'] !== 'undefined';
}
