export const ENCOURAGEMENT_MESSAGES = [
  "You're staying on budget this month. Nice work.",
  "You're still on track.",
  "Things are looking stable right now.",
  "Good job keeping an eye on things.",
  "One rough week does not erase your progress.",
  "You came back. That counts.",
  "Your savings are slowly becoming security.",
  "You can still rebalance this.",
  "You're doing okay.",
  "Let's make the next step simple.",
  "Small steps still move you forward.",
  "Every expense you track puts you more in control.",
  "You're building a habit. That matters.",
  "This month got a little tight — but you're handling it.",
  "Looking good so far this month.",
  "You have not given up. That means everything.",
  "Progress is progress, no matter the pace.",
  "You're paying attention. That's the hardest part.",
  "Keep going. You're doing better than you think.",
  "Tracking is winning. You're tracking.",
];

export function getEncouragementMessage(recentlyUsed: string[] = []): string {
  const available = ENCOURAGEMENT_MESSAGES.filter(
    (m) => !recentlyUsed.includes(m)
  );
  const pool = available.length > 0 ? available : ENCOURAGEMENT_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}
