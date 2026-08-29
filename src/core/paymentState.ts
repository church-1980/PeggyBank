/**
 * IS THIS SOMETHING I HAVE TO DO, OR DOES IT JUST HAPPEN?
 *
 * PeggyBank knows two different things about a recurring payment, and they
 * were previously the same thing:
 *
 *   - WHAT THE USER MUST DO   — hydro will not pay itself
 *   - WHAT IS EXPECTED TO HAPPEN — Bell takes its own money on the 28th
 *
 * Treating both as "unpaid until you tick it" made people do fake manual work
 * every month to keep the app caught up.
 *
 * THE MONEY RULE THAT MAKES THIS SAFE
 * -----------------------------------
 * None of this is arithmetic. The financial engine subtracts a bill occurrence
 * EXACTLY ONCE, either as money still owed or as money already gone:
 *
 *     no payment row  -> counted in "bills you still owe"
 *     paid row        -> counted in "bills already paid"
 *
 * Every state below maps onto exactly one of those two buckets — see
 * `isReserved` / `isGone`, which are exhaustive and mutually exclusive. So a
 * state transition can never create or destroy money. It cannot: there is no
 * arithmetic in this file at all.
 *
 * PeggyBank has NO bank connection. It therefore never claims to have seen a
 * withdrawal. It knows what it EXPECTS, and it knows what the user has
 * CONFIRMED, and it keeps those apart.
 */

/** How a recurring payment is normally handled. */
export type PaymentMethod = 'manual' | 'auto';

/**
 * What a payment row means. Only rows with paid = 1 reach the finance engine.
 *   confirmed — the user says it happened          (paid = 1)
 *   assumed   — auto-pay the user asked us to take on trust (paid = 1)
 *   failed    — the user says it did NOT happen    (paid = 0, still owed)
 */
export type PaymentStatus = 'confirmed' | 'assumed' | 'failed';

/** The state of ONE occurrence of one bill. Derived, never stored. */
export type OccurrenceState =
  | 'upcoming'   // due date has not arrived
  | 'due'        // manual, due now or overdue, still the user's job
  | 'expected'   // auto-pay, date has passed, we have not been told either way
  | 'paid'       // the user confirmed it
  | 'assumed'    // auto-pay taken on trust at the user's request
  | 'failed';    // the user told us it did not go through

export interface OccurrencePayment {
  paid: boolean;
  status?: PaymentStatus | null;
  /** What actually left the account, when it differed from the plan. */
  amount?: number | null;
}

export interface OccurrenceInput {
  method: PaymentMethod;
  /** The due date of THIS occurrence, YYYY-MM-DD. */
  cycleDate: string;
  /** Today, as YYYY-MM-DD. Compared as a string: no timezone can shift it. */
  today: string;
  /** The bill_payments row for this occurrence, if there is one. */
  payment?: OccurrencePayment | null;
}

/**
 * What is true about this occurrence right now.
 *
 * A stored payment always wins over the calendar: if the user has told us what
 * happened, the date no longer gets an opinion.
 */
export function occurrenceState(input: OccurrenceInput): OccurrenceState {
  const p = input.payment;

  if (p) {
    if (p.status === 'failed' || !p.paid) return 'failed';
    return p.status === 'assumed' ? 'assumed' : 'paid';
  }

  // Nothing recorded. The calendar decides.
  if (input.cycleDate > input.today) return 'upcoming';
  return input.method === 'auto' ? 'expected' : 'due';
}

/**
 * Is this money still owed — reserved, not yet gone?
 *
 * A failed auto-payment is emphatically still owed: the bill did not pay
 * itself, so the money must not be released back into Safe to Spend.
 */
export function isReserved(state: OccurrenceState): boolean {
  return state === 'upcoming' || state === 'due' || state === 'expected' || state === 'failed';
}

/** Has this money left the account? */
export function isGone(state: OccurrenceState): boolean {
  return state === 'paid' || state === 'assumed';
}

/** Does this occurrence want the user to do something? */
export function needsAttention(state: OccurrenceState): boolean {
  return state === 'due' || state === 'expected' || state === 'failed';
}

/** Every state, so tests can prove the two buckets are exhaustive. */
export const ALL_STATES: OccurrenceState[] =
  ['upcoming', 'due', 'expected', 'paid', 'assumed', 'failed'];

/**
 * WHAT THE PERSON READS.
 *
 * The engine above knows about occurrences, statuses and reservations. None of
 * those words may ever reach the screen. This is the whole translation layer,
 * kept in one place so every screen says the same thing about the same state.
 *
 * `tone` lets a screen colour the row without knowing what a state is:
 *   'calm'    — nothing to do
 *   'action'  — the user needs to do something
 *   'done'    — settled
 */
export interface OccurrenceLabel {
  /** Short status, e.g. "Auto-pay Friday", "Due Friday", "Paid". */
  label: string;
  tone: 'calm' | 'action' | 'done';
  /** The one button this row should offer, if any. */
  action?: 'markPaid' | 'verify';
  /** Badge for lists that show many bills at once. Null when it would be noise. */
  badge?: 'YOU PAY' | 'AUTO-PAY' | null;
}

/**
 * `when` is already-friendly wording for the date — "today", "Friday",
 * "Sep 2". Callers format it; this function only decides the sentence.
 */
export function describeOccurrence(
  state: OccurrenceState, method: PaymentMethod, when: string, isSubscription = false,
): OccurrenceLabel {
  const auto = isSubscription ? 'Auto-charge' : 'Auto-pay';
  const badge = method === 'auto' ? (isSubscription ? 'AUTO-PAY' : 'AUTO-PAY') : 'YOU PAY';

  switch (state) {
    case 'upcoming':
      return method === 'auto'
        ? { label: auto + ' ' + when, tone: 'calm', badge }
        : { label: 'Due ' + when, tone: 'calm', action: 'markPaid', badge };

    case 'due':
      return { label: 'Due ' + when, tone: 'action', action: 'markPaid', badge };

    // Never "verified", never "we saw the bank take it". We expected it.
    case 'expected':
      return { label: 'Check payment', tone: 'action', action: 'verify', badge };

    case 'paid':
      return { label: 'Paid', tone: 'done', badge: null };

    // Honest: the user asked us to take this on trust, so we say so quietly.
    case 'assumed':
      return { label: 'Paid automatically', tone: 'done', badge: null };

    case 'failed':
      return { label: 'Not paid — still owed', tone: 'action', action: 'markPaid', badge };
  }
}
