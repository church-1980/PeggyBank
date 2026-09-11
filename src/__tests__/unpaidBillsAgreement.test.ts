/**
 * "HOW MUCH IS STILL OWED?" — now answered in exactly ONE place.
 *
 * An architecture audit found THREE implementations agreeing by
 * coincidence, not by construction: core/finance's unpaidBillsTotal (which
 * says of itself "No screen may recompute a field itself"), BillsScreen's
 * own recompute as (billsTotal - billsPaid) + (subsTotal - subsPaid), and
 * lib/billCycles's unpaidTotalForCurrentCycles, which nothing called.
 *
 * Section 13/12 of the repair pass removed the other two: BillsScreen now
 * reads loadFinanceSummary()'s unpaidBillsTotal directly instead of
 * recomputing it, and the dead billCycles implementation was deleted
 * (Section 12 — "do not keep obsolete financial algorithms around 'just in
 * case'").
 *
 * These scenarios are RETAINED as the brief asked, now pinning the single
 * remaining engine directly against the same edge cases the audit used:
 * a bill and subscription sharing an id, an overpayment, a failed payment,
 * the 28th-clamp on a due day past it, and a weekly bill.
 */

import { makeRealDb } from './helpers/realDb';
import { buildFinanceInput, loadFinanceSummary } from '../lib/financeSummary';
import { computeFinanceSummary } from '../core/finance';

const REF = new Date(2026, 8, 4); // 4 Sep 2026

const scenarios: { name: string; seed: (db: any) => Promise<void>; expected: number }[] = [
  {
    name: 'nothing paid',
    expected: 117 + 16.49,
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Hydro',117,5,'monthly')`);
      await db.runAsync(`INSERT INTO subscriptions (id,name,amount,billing_day) VALUES (1,'Netflix',16.49,22)`);
    },
  },
  {
    name: 'bill paid this cycle',
    expected: 16.49,
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Hydro',117,5,'monthly')`);
      await db.runAsync(`INSERT INTO subscriptions (id,name,amount,billing_day) VALUES (1,'Netflix',16.49,22)`);
      await db.runAsync(`INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (1,'bill','2026-09-05',1,117)`);
    },
  },
  {
    name: 'bill and subscription share id 1, only the bill is paid',
    expected: 16.49,
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Hydro',117,5,'monthly')`);
      await db.runAsync(`INSERT INTO subscriptions (id,name,amount,billing_day) VALUES (1,'Netflix',16.49,5)`);
      await db.runAsync(`INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (1,'bill','2026-09-05',1,117)`);
    },
  },
  {
    name: 'paid MORE than planned',
    expected: 0,
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Hydro',117,5,'monthly')`);
      await db.runAsync(`INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (1,'bill','2026-09-05',1,130)`);
    },
  },
  {
    name: 'a FAILED payment (paid = 0)',
    expected: 117,
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Hydro',117,5,'monthly')`);
      await db.runAsync(`INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount,status) VALUES (1,'bill','2026-09-05',0,NULL,'failed')`);
    },
  },
  {
    name: 'due on the 31st (clamp territory)',
    expected: 0,
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Rent',900,31,'monthly')`);
      await db.runAsync(`INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (1,'bill','2026-09-28',1,900)`);
    },
  },
  {
    name: 'weekly bill',
    expected: 30,
    seed: async (db) => {
      await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,due_weekday,frequency) VALUES (1,'Cleaner',30,NULL,5,'weekly')`);
    },
  },
];

describe('unpaidBillsTotal — the one remaining implementation', () => {
  for (const s of scenarios) {
    it(s.name, async () => {
      const db: any = makeRealDb();
      await s.seed(db);

      const engine = computeFinanceSummary(await buildFinanceInput(db, REF)).unpaidBillsTotal;
      // The exact path BillsScreen calls (Section 13) — not a copy of its
      // old formula, its REAL current data path.
      const screen = (await loadFinanceSummary(db, REF)).unpaidBillsTotal;

      expect(engine).toBeCloseTo(s.expected, 2);
      expect(screen).toBe(engine);
    });
  }
});
