/**
 * THE INSTALL SAFETY GATE.
 *
 * This is the most safety-critical logic in the project, and it is not about
 * money — it is about not destroying money records.
 *
 * PeggyBank's real app is com.spall.peggybank and holds the only copy of
 * someone's financial history. A locally-built APK carrying that same id cannot
 * upgrade it, because it is signed with a different key. Android's only offer
 * at that point is "uninstall the existing app first", and uninstalling takes
 * the database with it. There is no undo.
 *
 * So a development build must be com.spall.peggybank.dev, which Android treats
 * as a separate app with its own storage. If this gate ever returns safe for
 * the production id, someone loses their records.
 */

const { verdictFor, PRODUCTION_ID, DEV_ID } = require('../../scripts/androidtest/safety.js');

describe('Nothing with the production id may ever be installed', () => {
  it('REFUSES the production application id', () => {
    const v = verdictFor(PRODUCTION_ID);
    expect(v.safe).toBe(false);
    expect(v.reason).toContain('PRODUCTION');
  });

  it('explains what would actually happen, not just that it refused', () => {
    // A bare "not allowed" teaches nobody why, and invites someone to override it.
    expect(verdictFor(PRODUCTION_ID).reason).toMatch(/deletes the database|uninstall/i);
  });

  it('allows the dev id', () => {
    expect(verdictFor(DEV_ID).safe).toBe(true);
  });

  it('refuses anything that merely looks close to the dev id', () => {
    for (const near of [
      'com.spall.peggybank.Dev',        // wrong case
      'com.spall.peggybank.dev2',
      'com.spall.peggybankdev',
      'com.spall.peggybank.dev.dev',
      'com.spall.peggybank ',           // trailing space
      '',
    ]) {
      expect(verdictFor(near).safe).toBe(false);
    }
  });

  it('is not fooled by a package that merely contains the dev id', () => {
    expect(verdictFor('com.evil.com.spall.peggybank.dev').safe).toBe(false);
  });

  it('the two ids are genuinely different apps to Android', () => {
    // Guards against someone "simplifying" these constants into the same value.
    expect(DEV_ID).not.toBe(PRODUCTION_ID);
    expect(DEV_ID.startsWith(PRODUCTION_ID + '.')).toBe(true);
  });
});
