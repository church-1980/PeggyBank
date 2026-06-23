export function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];
  return { start, end };
}

// Days until a specific day-of-month (e.g. the 15th)
export function getDaysUntil(targetDay: number): number {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), targetDay);
  if (thisMonth < today) {
    thisMonth.setMonth(thisMonth.getMonth() + 1);
  }
  const diff = thisMonth.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Days until the next occurrence of a weekday (0=Sun, 1=Mon ... 6=Sat)
export function getDaysUntilWeekday(weekday: number): number {
  const today = new Date();
  const todayDay = today.getDay();
  let diff = weekday - todayDay;
  if (diff <= 0) diff += 7;
  return diff;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Financial calculations
//
// These are the canonical, unit-tested implementations of PeggyBank's money
// math. DashboardScreen currently inlines equivalent logic; it should be
// migrated to call these so the formula has a single tested source of truth.
// Pure functions only — no DB, no UI.
// ---------------------------------------------------------------------------

// Monthly amount to set aside for a single goal: the remaining gap spread over
// 12 months. Never negative (a fully-funded goal contributes 0).
export function monthlyGoalContribution(targetAmount: number, currentAmount: number): number {
  return Math.max(0, targetAmount - currentAmount) / 12;
}

export interface SafeToSpendInput {
  totalIncome: number;
  totalSpending: number;
  unpaidBillsTotal: number;
  goals: { target_amount: number; current_amount: number }[];
}

// Safe to Spend = income − spending − unpaid bills − monthly goal savings,
// clamped at 0 so the user is never shown a negative "safe" number.
export function computeSafeToSpend(input: SafeToSpendInput): number {
  const goalsSavingsNeeded = input.goals.reduce(
    (sum, g) => sum + monthlyGoalContribution(g.target_amount, g.current_amount),
    0
  );
  const moneyLeft = input.totalIncome - input.totalSpending;
  return Math.max(0, moneyLeft - input.unpaidBillsTotal - goalsSavingsNeeded);
}

// Goal completion as a 0–100 percentage, clamped. Returns 0 for a zero/invalid
// target so the UI never divides by zero or shows NaN%.
export function goalProgressPercent(targetAmount: number, currentAmount: number): number {
  if (!targetAmount || targetAmount <= 0) return 0;
  const pct = (currentAmount / targetAmount) * 100;
  return Math.max(0, Math.min(100, pct));
}
