import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LOCALES, LOCALE_NAMES, type Locale } from '../core/localeFormat';
import { tFor } from '../i18n';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { PeggyScreen, PeggyHeader } from '../components/peggy';

/**
 * Choosing a language.
 *
 * Deliberately mirrors AppearanceScreen — same card, same rows, same tick —
 * because it is the same kind of decision and a person should not have to
 * learn a second pattern for it.
 *
 * TWO THINGS THIS SCREEN DOES DIFFERENTLY FROM MOST LANGUAGE PICKERS
 *
 * Each language is named in ITS OWN language: Français, not "French". Someone
 * whose device is set to a language they cannot read has to be able to find
 * their way out, and "French" is no help to them.
 *
 * Each row shows what that language will look like — its name, and today's
 * money format — so the choice can be made by recognition rather than by
 * committing to it and seeing what happens.
 */

export default function LanguageScreen({ navigation }: any) {
  const C = useColors();
  const { locale, setLocale, t } = useLanguage();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <PeggyScreen>
      <PeggyHeader title={t('settings.language')} onBack={() => navigation.goBack()} />

      <View style={[styles.card, { backgroundColor: C.bgCard }]}>
        {LOCALES.map((code: Locale, i) => {
          const active = locale === code;
          return (
            <TouchableOpacity
              key={code}
              style={[
                styles.row,
                i === 0 && styles.rowFirst,
                { borderTopColor: C.border },
                active && { backgroundColor: C.primaryGlow },
              ]}
              onPress={() => setLocale(code)}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={LOCALE_NAMES[code]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{LOCALE_NAMES[code]}</Text>
                {/* The same sentence, already in that language, so the choice
                    can be recognised rather than gambled on. */}
                <Text style={styles.rowSub}>{tFor(code, 'money.safeToSpend')}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.noteCard, { backgroundColor: C.primaryGlow }]}>
        <Ionicons name="information-circle-outline" size={16} color={C.primary} />
        <Text style={styles.noteText}>
          {t('language.savedOnPhone')}
        </Text>
      </View>
    </PeggyScreen>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    card:      { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
    row:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, minHeight: 64, borderTopWidth: 1 },
    rowFirst:  { borderTopWidth: 0 },
    rowText:   { flex: 1 },
    rowLabel:  { ...Typography.bodyBold, color: C.textPrimary },
    rowSub:    { ...Typography.caption, color: C.textSecondary, marginTop: 2 },
    noteCard:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
    noteText:  { ...Typography.caption, color: C.textSecondary, flex: 1 },
  });
}
