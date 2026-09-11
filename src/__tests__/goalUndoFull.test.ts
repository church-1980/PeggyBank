/**
 * D6 — Undo after deleting a savings goal restores the COMPLETE row.
 *
 * GoalsScreen.handleUndo() used to INSERT only four hand-picked columns
 * (name, target_amount, current_amount, deadline). goal_type, pinned and
 * custom_image_uri were silently dropped -- a goal with a custom icon,
 * pinned to the top, with progress, came back generic and unpinned.
 *
 * The fix captures the full row (already loaded via SELECT *) and restores
 * every column dynamically, so a column added to savings_goals in the
 * future is restored automatically rather than needing Undo's INSERT
 * hand-updated too. This test drives the exact same two SQL operations
 * GoalsScreen.deleteGoal()/handleUndo() perform, against real SQLite.
 */
import { makeRealDb } from './helpers/realDb';

let db: any;
beforeEach(() => { db = makeRealDb(); });

async function undoRestore(goal: Record<string, unknown>) {
  const { id, ...rest } = goal;
  const cols = Object.keys(rest);
  await db.runAsync(
    `INSERT INTO savings_goals (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    cols.map(c => (rest as Record<string, unknown>)[c] ?? null)
  );
}

describe('Deleting a goal, then undoing it', () => {
  it('restores type, pinned state, custom image and progress -- everything', async () => {
    await db.runAsync(
      `INSERT INTO savings_goals (id, name, target_amount, current_amount, deadline, goal_type, pinned, custom_image_uri)
       VALUES (1, 'Emergency Fund', 3000, 1200, '2026-12-01', 'emergency', 1, 'file:///goal.jpg')`
    );
    const before = await db.getFirstAsync(`SELECT * FROM savings_goals WHERE id=1`);

    await db.runAsync(`DELETE FROM savings_goals WHERE id=1`);
    expect((await db.getAllAsync(`SELECT * FROM savings_goals`)).length).toBe(0);

    await undoRestore(before);

    const after = await db.getFirstAsync(`SELECT * FROM savings_goals`);
    expect(after.name).toBe('Emergency Fund');
    expect(after.target_amount).toBe(3000);
    expect(after.current_amount).toBe(1200);
    expect(after.deadline).toBe('2026-12-01');
    // FIXED: these three used to come back null/0/default.
    expect(after.goal_type).toBe('emergency');
    expect(after.pinned).toBe(1);
    expect(after.custom_image_uri).toBe('file:///goal.jpg');
  });

  it('a goal with no optional fields set restores cleanly (no undefined leaking into SQL)', async () => {
    await db.runAsync(
      `INSERT INTO savings_goals (id, name, target_amount, current_amount) VALUES (1, 'Vacation', 2000, 0)`
    );
    const before = await db.getFirstAsync(`SELECT * FROM savings_goals WHERE id=1`);
    await db.runAsync(`DELETE FROM savings_goals WHERE id=1`);
    await undoRestore(before);
    const after = await db.getFirstAsync(`SELECT * FROM savings_goals`);
    expect(after.name).toBe('Vacation');
    expect(after.goal_type).toBeNull();
    expect(after.pinned).toBe(0); // schema default
  });
});
