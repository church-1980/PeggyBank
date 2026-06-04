// Reads real app data and picks a message that fits the situation.
// Fully offline — no AI, no internet.

export interface FinancialSnapshot {
  totalIncome: number;
  totalSpending: number;
  unpaidBills: number;
  savingsProgress: number;   // 0–1, average across goals
  daysIntoMonth: number;
  hasAnyData: boolean;
}

interface EncouragementRule {
  condition: (s: FinancialSnapshot) => boolean;
  messages: string[];
}

const RULES: EncouragementRule[] = [
  {
    // Just opened the app, no data yet
    condition: (s) => !s.hasAnyData,
    messages: [
      "Welcome. Every big change starts with one small step.",
      "You showed up. That is the hardest part.",
      "PeggyBank is ready when you are. No rush.",
    ],
  },
  {
    // Paid off all bills this month
    condition: (s) => s.unpaidBills === 0 && s.totalIncome > 0,
    messages: [
      "All your bills are handled. That is a big deal.",
      "Bills sorted. You can breathe a little easier now.",
      "No bills left unpaid this month. Well done.",
    ],
  },
  {
    // Savings going well
    condition: (s) => s.savingsProgress >= 0.5,
    messages: [
      "Your savings are growing. You are building something real.",
      "More than halfway to your savings goal. Keep going.",
      "Your future self will thank you for this.",
    ],
  },
  {
    // Spending is very low — well under budget
    condition: (s) => s.totalIncome > 0 && s.totalSpending / s.totalIncome < 0.4 && s.daysIntoMonth > 10,
    messages: [
      "You are well within budget this month. Nice.",
      "Spending is low so far. You are doing great.",
      "Things are looking stable right now.",
    ],
  },
  {
    // On budget — spending is reasonable
    condition: (s) => s.totalIncome > 0 && s.totalSpending / s.totalIncome >= 0.4 && s.totalSpending / s.totalIncome < 0.75,
    messages: [
      "You are staying on budget this month.",
      "Good job keeping an eye on things.",
      "You are still on track.",
      "One step at a time. You are doing it.",
    ],
  },
  {
    // Getting tight — 75–90% of income spent
    condition: (s) => s.totalIncome > 0 && s.totalSpending / s.totalIncome >= 0.75 && s.totalSpending / s.totalIncome < 0.95,
    messages: [
      "Things are getting a little tight — but you are aware of it. That matters.",
      "You can still rebalance this. You have time.",
      "A tight month does not erase your progress.",
    ],
  },
  {
    // Over budget
    condition: (s) => s.totalIncome > 0 && s.totalSpending >= s.totalIncome,
    messages: [
      "This month got a little stretched. It happens. Let's look at what comes next.",
      "One rough month does not erase your progress.",
      "You came back and checked. That already counts for something.",
    ],
  },
  {
    // Early in the month
    condition: (s) => s.daysIntoMonth <= 5 && s.totalIncome > 0,
    messages: [
      "Fresh start to the month. You have got this.",
      "New month, new chance to get it right.",
      "Early days — you are already ahead by tracking.",
    ],
  },
  {
    // Generic fallback
    condition: () => true,
    messages: [
      "Small steps still move you forward.",
      "Tracking is winning. You are tracking.",
      "Progress is progress, no matter the pace.",
      "You are paying attention. That is the hardest part.",
      "Keep going. You are doing better than you think.",
    ],
  },
];

let recentlyUsed: string[] = [];

export function getSmartEncouragement(snapshot: FinancialSnapshot): string {
  for (const rule of RULES) {
    if (rule.condition(snapshot)) {
      const available = rule.messages.filter((m) => !recentlyUsed.includes(m));
      const pool = available.length > 0 ? available : rule.messages;
      const message = pool[Math.floor(Math.random() * pool.length)];
      recentlyUsed = [message, ...recentlyUsed].slice(0, 6);
      return message;
    }
  }
  return "You are doing okay.";
}
