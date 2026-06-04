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
