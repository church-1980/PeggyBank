import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, Typography, ColorPalette } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import { localDateString, parseLocalDate, daysInMonth } from '../../core/datetime';

/**
 * PeggyDateField — choosing the day something happened.
 *
 * Money is only in the right month if it is on the right DAY, and people log
 * things late: pay that arrived Friday gets entered on Sunday. Every screen
 * that records money therefore needs a way to say when it happened, and before
 * this existed there was none — the date was silently stamped as "today" and
 * could never be corrected afterwards.
 *
 * It speaks in days, not in dates: "Today", "Yesterday", "Friday" for the
 * recent past, because that is how someone remembers when they were paid. The
 * calendar is there for anything older.
 *
 * All dates are LOCAL calendar dates (YYYY-MM-DD). Nothing here goes near UTC.
 */

interface Props {
  value: string;                    // YYYY-MM-DD
  onChange: (next: string) => void;
  label?: string;
  /** Days in the future the user may pick. 0 = today is the latest. */
  maxFutureDays?: number;
  testID?: string;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** "Today", "Yesterday", "Friday", or "21 Aug 2026" — whichever a person would say. */
export function describeDate(iso: string, today: Date = new Date()): string {
  const d = parseLocalDate(iso);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return WEEKDAY_SHORT[d.getDay()] === WEEKDAY_SHORT[t.getDay()]
    ? 'Last ' + fullWeekday(d) : fullWeekday(d);
  if (diff === -1) return 'Tomorrow';
  const sameYear = d.getFullYear() === t.getFullYear();
  return d.getDate() + ' ' + MONTH_NAMES[d.getMonth()].slice(0, 3) + (sameYear ? '' : ' ' + d.getFullYear());
}

function fullWeekday(d: Date) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
}

export default function PeggyDateField({ value, onChange, label = 'When', maxFutureDays = 0, testID }: Props) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [open, setOpen] = useState(false);

  const today = new Date();
  const todayIso = localDateString(today);
  const yesterdayIso = localDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));

  // The month shown in the picker follows whatever is currently selected.
  const selected = parseLocalDate(value || todayIso);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const latestAllowed = new Date(today.getFullYear(), today.getMonth(), today.getDate() + maxFutureDays);

  const pick = (iso: string) => { onChange(iso); setOpen(false); };

  const grid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const blanks = first.getDay();
    const total = daysInMonth(viewYear, viewMonth);
    const cells: (number | null)[] = Array(blanks).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  return (
    <View testID={testID}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.quickRow}>
        {[{ iso: todayIso, text: 'Today' }, { iso: yesterdayIso, text: 'Yesterday' }].map(q => (
          <TouchableOpacity
            key={q.text}
            style={[styles.quickChip, value === q.iso && styles.quickChipOn]}
            onPress={() => onChange(q.iso)}
            accessibilityRole="button"
            accessibilityLabel={'Set the date to ' + q.text.toLowerCase()}
            accessibilityState={{ selected: value === q.iso }}
          >
            <Text style={[styles.quickText, value === q.iso && styles.quickTextOn]}>{q.text}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.quickChip, styles.pickChip, value !== todayIso && value !== yesterdayIso && styles.quickChipOn]}
          onPress={() => { setViewYear(selected.getFullYear()); setViewMonth(selected.getMonth()); setOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel="Choose another date from a calendar"
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={value !== todayIso && value !== yesterdayIso ? C.textOnPrimary : C.textSecondary}
          />
          <Text style={[styles.quickText, value !== todayIso && value !== yesterdayIso && styles.quickTextOn]}>
            {value !== todayIso && value !== yesterdayIso ? describeDate(value, today) : 'Another day'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.monthRow}>
            <TouchableOpacity
              onPress={() => { const m = viewMonth - 1; if (m < 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(m); }}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              style={styles.monthNav}
            >
              <Ionicons name="chevron-back" size={20} color={C.primary} />
            </TouchableOpacity>

            <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>

            <TouchableOpacity
              onPress={() => { const m = viewMonth + 1; if (m > 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(m); }}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              style={styles.monthNav}
            >
              <Ionicons name="chevron-forward" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekHeader}>
            {WEEKDAY_SHORT.map(w => <Text key={w} style={styles.weekHeaderText}>{w}</Text>)}
          </View>

          <View style={styles.grid}>
            {grid.map((day, i) => {
              if (day === null) return <View key={'b' + i} style={styles.cell} />;
              const iso = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
              const isSelected = iso === value;
              const cellDate = new Date(viewYear, viewMonth, day);
              const tooFar = cellDate > latestAllowed;
              return (
                <TouchableOpacity
                  key={iso}
                  style={[styles.cell, isSelected && styles.cellOn]}
                  disabled={tooFar}
                  onPress={() => pick(iso)}
                  accessibilityRole="button"
                  accessibilityLabel={day + ' ' + MONTH_NAMES[viewMonth] + ' ' + viewYear}
                  accessibilityState={{ selected: isSelected, disabled: tooFar }}
                >
                  <Text style={[styles.cellText, isSelected && styles.cellTextOn, tooFar && styles.cellTextOff]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close the calendar without changing the date"
          >
            <Text style={styles.doneText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    label:        { ...Typography.label, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm },
    quickRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    quickChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      minHeight: 48, paddingHorizontal: 16, borderRadius: Radius.md,
      borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard,
      justifyContent: 'center',
    },
    pickChip:     { flexGrow: 1 },
    quickChipOn:  { backgroundColor: C.primary, borderColor: C.primary },
    quickText:    { ...Typography.body, color: C.textSecondary },
    quickTextOn:  { color: C.textOnPrimary, fontWeight: '700' },

    overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000066' },
    sheet: {
      position: 'absolute', left: Spacing.md, right: Spacing.md, top: '18%',
      backgroundColor: C.bgCard, borderRadius: Radius.lg, padding: Spacing.md,
    },
    monthRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
    monthNav:     { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    monthLabel:   { ...Typography.bodyBold, color: C.textPrimary },
    weekHeader:   { flexDirection: 'row' },
    weekHeaderText: { ...Typography.caption, color: C.textHint, width: `${100 / 7}%`, textAlign: 'center', marginBottom: 4 },
    grid:         { flexDirection: 'row', flexWrap: 'wrap' },
    cell:         { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
    cellOn:       { backgroundColor: C.primary },
    cellText:     { ...Typography.body, color: C.textPrimary },
    cellTextOn:   { color: C.textOnPrimary, fontWeight: '700' },
    cellTextOff:  { color: C.textHint, opacity: 0.4 },
    doneBtn:      { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
    doneText:     { ...Typography.body, color: C.textSecondary, fontWeight: '600' },
  });
}
