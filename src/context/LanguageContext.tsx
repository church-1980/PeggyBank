import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { getDatabase } from '../database/database';
import { tFor, resolveLocale, type Locale } from '../i18n';
import type { Vars } from '../i18n/translate';
import {
  formatMoney, formatNumber, formatLongDate, formatShortDate, formatMonthYear,
} from '../core/localeFormat';

/**
 * WHAT LANGUAGE IS THIS PERSON READING?
 *
 * Follows ThemeContext exactly — the app already had one way to hold a global
 * preference and persist it to the settings table, and a second way would be a
 * second thing to keep working.
 *
 * The formatters are exposed from here rather than imported directly by screens
 * so that a screen can never accidentally format money in a language the reader
 * did not choose. There is one `money()` and it always knows the locale.
 */

interface LanguageValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate a key. */
  t: (key: string, vars?: Vars) => string;
  /** Money, written the way this reader writes money. */
  money: (amount: number) => string;
  num: (value: number, decimals?: number) => string;
  longDate: (d: Date) => string;
  shortDate: (d: Date) => string;
  monthYear: (d: Date) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

const SETTING_KEY = 'app_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  // What the person chose last time, if anything.
  useEffect(() => {
    let alive = true;
    getDatabase()
      .then(db => db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = ?`, [SETTING_KEY]))
      .then(row => { if (alive && row?.value) setLocaleState(resolveLocale(row.value)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const setLocale = useCallback((l: Locale) => {
    // Change the screen first. Waiting on a database write to redraw makes the
    // app feel broken for the moment it takes.
    setLocaleState(l);
    getDatabase()
      .then(db => db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [SETTING_KEY, l]))
      .catch(() => {});
  }, []);

  const value = useMemo<LanguageValue>(() => ({
    locale,
    setLocale,
    t:         (key, vars) => tFor(locale, key, vars),
    money:     (amount) => formatMoney(amount, locale),
    num:       (v, d) => formatNumber(v, locale, d),
    longDate:  (d) => formatLongDate(d, locale),
    shortDate: (d) => formatShortDate(d, locale),
    monthYear: (d) => formatMonthYear(d, locale),
  }), [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Read the language anywhere.
 *
 * Falls back to English rather than throwing when no provider is present, so a
 * component rendered in a test harness still produces readable text instead of
 * crashing on a missing context.
 */
export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return {
    locale: 'en',
    setLocale: () => {},
    t:         (key, vars) => tFor('en', key, vars),
    money:     (amount) => formatMoney(amount, 'en'),
    num:       (v, d) => formatNumber(v, 'en', d),
    longDate:  (d) => formatLongDate(d, 'en'),
    shortDate: (d) => formatShortDate(d, 'en'),
    monthYear: (d) => formatMonthYear(d, 'en'),
  };
}

/** Just the translator, for components that need nothing else. */
export function useT() { return useLanguage().t; }
