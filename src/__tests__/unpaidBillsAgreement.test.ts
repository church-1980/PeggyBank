/**
 * THREE PLACES ANSWER "HOW MUCH IS STILL OWED?"
 *
 * core/finance owns unpaidBillsTotal and says of itself: "No screen may
 * recompute a field itself." BillsScreen recomputes it anyway, as
 * (billsTotal - billsPaid) + (subsTotal - subsPaid), to print "Still due".
 * lib/billCycles has a third implementation, unpaidTotalForCurrentCycles,
 * which nothing currently calls.
 *
 * An architecture audit found all three AGREE today. That is worth pinning
 * rather than trusting: they agree because they happen to share
 * currentCycleDate and the same paid=1 filter, not because anything makes
 * them. The day one of them changes, this fails instead of a person being
 * quietly told a different figure on two screens.
 *
 * The right fix is for the screen to read the engine's field. Until that is
 * asked for, this holds the line.
 */

import { makeRealDb } from './helpers/realDb';
import { buildFinanceInput } from '../lib/financeSummary';
import { computeFinanceSummary } from '../core/finance';
import { currentCycleDate, paidCyclesFor, unpaidTotalForCurrentCycles } from '../lib/billCycles';

const REF = new Date(2026, 8, 4); // 4 Sep 2026

/** BillsScreen's own formula, copied verbatim from the screen. */
async function billsScreenUnpaid(db: any) {
  const bills = await db.getAllAsync(`SELECT * FROM bills`);
  const subs  = await db.getAllAsync(`SELECT * FROM subscriptions`);
  const paidBills = await paidCyclesFor(db, 'bill');
  const paidSubs  = await paidCyclesFor(db, 'subscription');
  const billPaid = (b: any) => !!paidBills.get(b.id)?.has(currentCycleDate(b, REF));
  const subPaid  = (s: any) => !!paidSubs.get(s.id)?.has(currentCycleDate({ id: s.id, billing_day: s.billing_day } as any, REF));
  const billsTotal = bills.reduce((s: number, b: any) => s + b.amount, 0);
  const subsTotal  = subs.reduce((s: number, b: any) => s + b.amount, 0);
  const billsPaid  = bills.filter(billPaid).reduce((s: number, b: any) => s + b.amount, 0);
  const subsPaid   = subs.filter(subPaid).reduce((s: number, b: any) => s + b.amount, 0);
  return (billsTotal - billsPaid) + (subsTotal - subsPaid);
}

async function engineUnpaid(db: any) {
  return computeFinanceSummary(await buildFinanceInput(db, REF)).unpaidBillsTotal;
}

const scenarios: { name: string; seed: (db: any) => Promise<void> }[] = [
  {
    name: 'nothing paid',
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Hydro',117,5,'monthly')`);
      await db.runAsync(`INSERT INTO subscriptions (id,name,amount,billing_day) VALUES (1,'Netflix',16.49,22)`);
    },
  },
  {
    name: 'bill paid this cycle',
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Hydro',117,5,'monthly')`);
      await db.runAsync(`INSERT INTO subscriptions (id,name,amount,billing_day) VALUES (1,'Netflix',16.49,22)`);
      await db.runAsync(`INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (1,'bill','2026-09-05',1,117)`);
    },
  },
  {
    name: 'bill and subscription share id 1, only the bill is paid',
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Hydro',117,5,'monthly')`);
      await db.runAsync(`INSERT INTO subscriptions (id,name,amount,billing_day) VALUES (1,'Netflix',16.49,5)`);
      await db.runAsync(`INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (1,'bill','2026-09-05',1,117)`);
    },
  },
  {
    name: 'paid MORE than planned',
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Hydro',117,5,'monthly')`);
      await db.runAsync(`INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (1,'bill','2026-09-05',1,130)`);
    },
  },
  {
    name: 'a FAILED payment (paid = 0)',
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Hydro',117,5,'monthly')`);
      await db.runAsync(`INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount,status) VALUES (1,'bill','2026-09-05',0,NULL,'failed')`);
    },
  },
  {
    name: 'due on the 31st (clamp territory)',
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Rent',900,31,'monthly')`);
      await db.runAsync(`INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (1,'bill','2026-09-28',1,900)`);
    },
  },
  {
    name: 'weekly bill',
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,due_weekday,frequency) VALUES (1,'Cleaner',30,NULL,5,'weekly')`);
    },
  },
];

describe('Every implementation of "still owed" gives the same answer', () => {
  for (const s of scenarios) {
    it(s.name, async () => {
      const db = makeRealDb();
      await s.seed(db);

      const engine = await engineUnpaid(db);
      const screen = await billsScreenUnpaid(db);
      const orphan = await unpaidTotalForCurrentCycles(db as any, REF);

      // Compared as strings so a failure prints all three figures at once.
      expect('BillsScreen=' + screen.toFixed(2)).toBe('BillsScreen=' + engine.toFixed(2));
      expect('billCycles=' + orphan.toFixed(2)).toBe('billCycles=' + engine.toFixed(2));
    });
  }
});
