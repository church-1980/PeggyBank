// Premium feature gate.
// Returns false for all users until IAP / subscription is wired up.
// Replace the body of isPremium() with your expo-iap or RevenueCat check.
export function isPremium(): boolean {
  return false;
}

export const PREMIUM_PRINTER_LIMIT = 3;

// Checks whether the user can add another printer under the free tier.
export function canAddPrinter(currentCount: number): boolean {
  return isPremium() || currentCount < PREMIUM_PRINTER_LIMIT;
}
