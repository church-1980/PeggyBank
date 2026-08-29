import type { Phrase } from '../translate';

/**
 * ENGLISH — the source of truth.
 *
 * Every other language is a translation OF THIS FILE. A key that does not exist
 * here does not exist at all, and a test fails if any translation invents one
 * or omits one.
 *
 * WRITING RULES (they are why the translations can be good)
 *  - One key, one complete sentence. Never assemble a sentence from fragments:
 *    word order differs per language and a translator handed "of" cannot know
 *    what it belongs to.
 *  - Put values in {placeholders}, never by splicing strings together.
 *  - Name keys for MEANING, not for where they happen to appear.
 *  - Plain language. If English needs a plain word, so does everyone else.
 */
export const en: Record<string, Phrase> = {
  // ── Words the whole app shares ─────────────────────────────────────────
  'common.save':        'Save',
  'common.cancel':      'Cancel',
  'common.delete':      'Delete',
  'common.close':       'Close',
  'common.edit':        'Edit',
  'common.add':         'Add',
  'common.done':        'Done',
  'common.back':        'Back',
  'common.retry':       'Try again',
  'common.undo':        'Undo',
  'common.today':       'today',
  'common.tomorrow':    'tomorrow',
  'common.yesterday':   'yesterday',
  'common.inDays':      { one: 'in {count} day', other: 'in {count} days' },
  'common.oops':        'Oops',
  'common.somethingWrong': 'Something went wrong. Please try again.',

  // ── Navigation ─────────────────────────────────────────────────────────
  'nav.home':      'Home',
  'nav.more':      'More',
  'nav.settings':  'Settings',
  'nav.spending':  'Spending',
  'nav.income':    'Income',
  'nav.bills':     'Bills & Subscriptions',
  'nav.goals':     'Savings Goals',
  'nav.debt':      'Debt Tracker',
  'nav.calendar':  'Calendar',
  'nav.breakdown': 'Monthly Breakdown',
  'nav.activity':  'What Happened',
  'nav.currency':  'Currency Calculator',
  'nav.profile':   'Profile',

  // ── The money everyone looks at first ──────────────────────────────────
  //
  // "Safe to Spend" is a NAME, not a description. Translations keep it as a
  // short memorable phrase rather than explaining it, or the headline turns
  // into a sentence and stops being a headline.
  'money.safeToSpend':      'Safe to Spend',
  'money.yourSafeToSpend':  'Your Safe to Spend',
  'money.moneyIn':          'Money in',
  'money.moneyOut':         'Money out',
  'money.moneyLeftOver':    'Money left over',
  'money.overBudget':       'over budget this month',
  'money.everydaySpending': 'Everyday spending',
  'money.billsPaid':        'Bills paid',
  'money.billsYouOwe':      'Bills you still owe',
  'money.savingTowardGoals': 'Saving towards goals',
  'money.moneyInThisMonth': 'Money in this month',
  'money.perDay':           '{amount} a day',

  // ── Home ───────────────────────────────────────────────────────────────
  'home.quickAdd':        'Quick Add',
  'home.addExpense':      'Add Expense',
  'home.addIncome':       'Add Income',
  'home.addBill':         'Add Bill',
  'home.addToGoal':       'Add to Goal',
  'home.comingUp':        'Coming Up',
  'home.whatHappened':    'What happened',
  'home.yourGoals':       'Your Goals',
  'home.noFeaturedGoal':  'No featured goal',
  'home.pinAGoal':        'Pin a goal to track your progress here.',
  'home.browse':          'Browse',
  'home.viewBreakdown':   'View full breakdown',
  'home.whyThisNumber':   'Why is that my number?',
  'home.seeAll':          'See all',
  // ── Bills, and how they get paid ───────────────────────────────────────
  'bills.title':            'Bills & Subscriptions',
  'bills.bills':            'Bills',
  'bills.subscriptions':    'Subscriptions',
  'bills.stillToPay':       '{amount} still to pay',
  'bills.noBills':          'No bills yet — tap to add one',
  'bills.noSubscriptions':  'No subscriptions yet — tap to add one',
  'bills.thisMonth':        'Bills this month',
  'bills.paid':             'Paid',
  'bills.stillDue':         'Still due',
  'bills.paidOut':          'Paid out',
  'bills.name':             'Name',
  'bills.amount':           'Amount',
  'bills.addNew':           'Add New',
  'bills.editBill':         'Edit Bill',
  'bills.editSubscription': 'Edit Subscription',
  'bills.deleteBill':       'Delete this bill?',
  'bills.deleteBillBody':   'It will be removed from your bills list.',
  'bills.deleteSub':        'Remove this subscription?',
  'bills.deleteSubBody':    'It will be removed from your subscriptions list.',

  // How a bill is paid. "Auto-pay" is a name; keep it short in every language.
  'pay.question':      'How is this paid?',
  'pay.iPayIt':        'I pay it',
  'pay.iPayItHelp':    "You'll mark it paid.",
  'pay.autoPay':       'Auto-pay',
  'pay.autoPayHelp':   'It comes out on its own.',
  'pay.assumeIt':      "Don't ask me each month — assume it went through",

  // What a bill row says. PeggyBank has no bank connection, so nothing here
  // may claim a payment was SEEN — only expected, or confirmed by the person.
  'state.dueOn':          'Due {when}',
  'state.autoPayOn':      'Auto-pay {when}',
  'state.autoChargeOn':   'Auto-charge {when}',
  'state.checkPayment':   'Check payment',
  'state.paid':           'Paid',
  'state.paidAutomatically': 'Paid automatically',
  'state.notPaidStillOwed':  'Not paid — still owed',
  'state.youPay':         'YOU PAY',
  'state.autoPayBadge':   'AUTO-PAY',
  'state.markPaid':       'Mark paid',
  'state.check':          'Check',

  // The "did it come out?" question.
  'verify.expected':       '{amount} was expected to come out. Did it?',
  'verify.yesItWasPaid':   'Yes, it was paid',
  'verify.differentAmount': 'Different amount',
  'verify.didntGoThrough': "It didn't go through",
  'verify.askMeLater':     'Ask me later',

  // ── Spending ───────────────────────────────────────────────────────────
  'expense.add':        'Add Expense',
  'expense.edit':       'Edit Expense',
  'expense.amount':     'Amount',
  'expense.category':   'Category',
  'expense.note':       'Note',
  'expense.date':       'Date',
  'expense.whoWasIt':   'Who was it?',
  'expense.deleteThis': 'Delete this expense?',
  'expense.noneYet':    'No expenses yet',

  // ── Monthly Breakdown ──────────────────────────────────────────────────
  'breakdown.whatMoneyOutWas': 'What the money out was',
  'breakdown.whereMoneyWent':  'Where your money went',
  'breakdown.totalOut':        'Total out',
  'breakdown.everythingElse':  'Everything else',
  'breakdown.nothingThisMonth': 'No spending recorded this month.',
  // Statements of fact about the two numbers above them — never praise or blame.
  'breakdown.moreOutThanIn': 'More went out than came in this month. Here is where it went.',
  'breakdown.nearlyAllOut':  'Nearly everything that came in went back out this month.',
  'breakdown.someLeftOver':  'Some of what came in is still left over this month.',
  'breakdown.mostLeftOver':  'Most of what came in is still left over this month.',

  // ── Smart Capture ──────────────────────────────────────────────────────
  'capture.photograph':     'Photograph a receipt or bill',
  'capture.retake':         'Retake',
  'capture.usePhoto':       'Use Photo',
  'capture.reading':        'Reading your document…',
  'capture.onDevice':       'On your device — nothing is uploaded.',
  'capture.checkThis':      'CHECK THIS',
  'capture.thisIsA':        'THIS IS A',
  'capture.expense':        'Expense',
  'capture.bill':           'Bill',
  'capture.merchant':       'Merchant',
  'capture.payee':          'Payee',
  'capture.tapToAdd':       'Tap to add',
  'capture.tapToCorrect':   'Tap anything above to correct it. Your photo stays attached.',
  'capture.continue':       'Continue',
  'capture.enterManually':  'Enter manually',
  'capture.couldntRead':    "We couldn't read this document automatically. Your photo is saved — choose where it belongs and enter the details.",
  'capture.cameraNeeded':   'Camera access needed',
  'capture.cameraWhy':      'PeggyBank uses the camera to photograph receipts and bills. Images stay on your device.',
  'capture.allowCamera':    'Allow camera',

  // ── Settings ───────────────────────────────────────────────────────────
  'settings.title':      'Settings',
  'settings.appearance': 'Appearance',
  'settings.language':   'Language',
  'settings.export':     'Export & Backup',
  'settings.share':      'Share with a Friend',
  'settings.notifications': 'NOTIFICATIONS',
  'settings.reminders':  'Reminders',
  'settings.testReminder': 'Send a test reminder',
  'language.savedOnPhone': 'Your choice is saved on this phone and never shared.',
};
