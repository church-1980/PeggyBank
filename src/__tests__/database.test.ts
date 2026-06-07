// Tests the database singleton behaviour using the mocked expo-sqlite.
// The actual SQLite driver is mocked in jest.setup.js.

jest.resetModules(); // reset module registry so we get a clean singleton each test

describe('getDatabase singleton', () => {
  beforeEach(() => {
    jest.resetModules();
    // Re-mock expo-sqlite fresh for each test
    jest.mock('expo-sqlite', () => {
      const mockDb = {
        getFirstAsync: jest.fn().mockResolvedValue({ '1': 1 }),
        getAllAsync:   jest.fn().mockResolvedValue([]),
        runAsync:      jest.fn().mockResolvedValue({ changes: 1 }),
        execAsync:     jest.fn().mockResolvedValue(undefined),
      };
      return {
        openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
        __mockDb: mockDb,
      };
    });
  });

  it('returns a database object', async () => {
    const { getDatabase } = require('../database/database');
    const db = await getDatabase();
    expect(db).toBeDefined();
  });

  it('returns the same instance on second call (singleton)', async () => {
    const { getDatabase } = require('../database/database');
    const db1 = await getDatabase();
    const db2 = await getDatabase();
    expect(db1).toBe(db2);
  });

  it('db has getFirstAsync method', async () => {
    const { getDatabase } = require('../database/database');
    const db = await getDatabase();
    expect(typeof db.getFirstAsync).toBe('function');
  });

  it('db has getAllAsync method', async () => {
    const { getDatabase } = require('../database/database');
    const db = await getDatabase();
    expect(typeof db.getAllAsync).toBe('function');
  });

  it('db has runAsync method', async () => {
    const { getDatabase } = require('../database/database');
    const db = await getDatabase();
    expect(typeof db.runAsync).toBe('function');
  });

  it('db has execAsync method', async () => {
    const { getDatabase } = require('../database/database');
    const db = await getDatabase();
    expect(typeof db.execAsync).toBe('function');
  });
});
