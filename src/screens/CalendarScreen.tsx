import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IconBadge from '../components/IconBadge';
import { getDatabase } from '../database/database';
import { methodOf } from '../lib/billCycles';
import { formatCurrency } from '../utils/helpers';
import { Expense, Bill, SavingsGoal } from '../types';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import PeggyScreen from '../components/peggy/PeggyScreen';
import PeggyIconFrame from '../components/peggy/PeggyIconFrame';
import { dueDayInMonth } from '../core/datetime';
import { activeSchedules, occurrencesBetween } from '../lib/incomeSchedules';
import { buildMonth, type CalendarEntry } from '../core/calendarMonth';

// ─────────────────────────────────────────────
// Local types
// ─────────────────────────────────────────────
type CalView = 'day' | 'week' | 'month';

interface CalEvent {
  key:       string;
  type:      'payday' | 'bill' | 'sub' | 'expense' | 'income' | 'goal' | 'reminder';
  title:     string;
  subtitle?: string;
  amount?:   number;
  colorHex:  string;
  time?:     string;
}

interface Subscription {
  id?:         number;
  name:        string;
  amount:      number;
  billing_day: number;
}

interface CalReminder {
  id?:   number;
  date:  string;
  time:  string;
  title: string;
}

type EventMap = Record<string, CalEvent[]>;
type Styles   = ReturnType<typeof makeStyles>;

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const QUICK_TIMES = [
  '7:00','8:00','9:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00',
];

const TYPE_ICON: Record<string, string> = {
  payday:   'cash-outline',
  income:   'arrow-down-circle-outline',
  bill:     'receipt-outline',
  sub:      'repeat-outline',
  goal:     'flag-outline',
  reminder: 'alarm-outline',
  expense:  'card-outline',
};

const TYPE_LABEL: Record<string, string> = {
  payday:   'Payday',
  income:   'Income',
  bill:     'Bill Due',
  sub:      'Subscription',
  goal:     'Goal Milestone',
  reminder: 'Reminder',
  expense:  'Spending',
};

const EVENT_ORDER = ['payday','income','bill','sub','goal','reminder','expense'] as const;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0'); }

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftDay(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function getWeekStart(d: Date): Date {
  const r = new Date(d);
  r.setDate(d.getDate() - d.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
}

function weekRangeLabel(start: Date): string {
  const end     = shiftDay(start, 6);
  const sMonth  = start.toLocaleDateString('en-US', { month: 'short' });
  const eMonth  = end.toLocaleDateString('en-US', { month: 'short' });
  const year    = end.getFullYear();
  if (sMonth === eMonth) return `${sMonth} ${start.getDate()} – ${end.getDate()}, ${year}`;
  return `${sMonth} ${start.getDate()} – ${eMonth} ${end.getDate()}, ${year}`;
}

function fmtHour(h: number) {
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h} ${h < 12 ? 'AM' : 'PM'}`;
}

// ─────────────────────────────────────────────
// Shared: Event list
// ─────────────────────────────────────────────
interface EventListProps {
  date:           Date;
  events:         CalEvent[];
  onAddReminder:  () => void;
  styles:         Styles;
  C:              ColorPalette;
}

function EventList({ date, events, onAddReminder, styles, C }: EventListProps) {
  const grouped: Partial<Record<string, CalEvent[]>> = {};
  for (const ev of events) {
    if (!grouped[ev.type]) grouped[ev.type] = [];
    grouped[ev.type]!.push(ev);
  }

  const weekday   = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateLabel = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <>
      <View style={styles.detailDateRow}>
        <Text style={styles.detailWeekday}>{weekday}</Text>
        <Text style={styles.detailDateStr}>{dateLabel}</Text>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <PeggyIconFrame iconKey="calendar" size="standard" shape="circle" />
          <Text style={styles.emptyTitle}>A calm day</Text>
          <Text style={styles.emptyText}>No financial events here.</Text>
        </View>
      ) : (
        EVENT_ORDER.map(type => {
          const evs = grouped[type];
          if (!evs) return null;
          return (
            <View key={type} style={styles.eventSection}>
              <Text style={styles.eventSectionLabel}>{TYPE_LABEL[type]}</Text>
              {evs.map(ev => (
                <View key={ev.key} style={[styles.eventCard, { borderLeftColor: ev.colorHex }]}>
                  <View style={[styles.eventIcon, { backgroundColor: ev.colorHex + '20' }]}>
                    <Ionicons name={TYPE_ICON[ev.type] as any} size={17} color={ev.colorHex} />
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{ev.title}</Text>
                    {!!ev.subtitle && <Text style={styles.eventSub}>{ev.subtitle}</Text>}
                    {!!ev.time && (
                      <Text style={styles.eventSub}>
                        {fmtHour(parseInt(ev.time.split(':')[0], 10))}
                      </Text>
                    )}
                  </View>
                  {ev.amount !== undefined && (
                    <Text style={[styles.eventAmt, { color: ev.colorHex }]}>
                      {ev.type === 'expense' ? '-' : '+'}{formatCurrency(ev.amount)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          );
        })
      )}

      <TouchableOpacity style={styles.addReminderBtn} onPress={onAddReminder} activeOpacity={0.8}>
        <IconBadge iconKey="due" color={C.primary} size={24} iconSize={16} tinted={false} />
        <Text style={styles.addReminderText}>Add a reminder</Text>
      </TouchableOpacity>
    </>
  );
}

// ─────────────────────────────────────────────
// Month View
// ─────────────────────────────────────────────
interface MonthViewProps {
  year: number; month: number; today: Date;
  eventMap: EventMap; selectedDate: Date;
  onDayPress: (day: number) => void;
  onPrev: () => void; onNext: () => void;
  styles: Styles; C: ColorPalette;
}

/** An amount short enough for a calendar cell. */
function shortMoney(n: number): string {
  const a = Math.abs(n);
  if (a >= 1000) return '$' + (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  if (a >= 100) return '$' + Math.round(a);
  return '$' + a.toFixed(a % 1 === 0 ? 0 : 2);
}

function MonthView({ year, month, today, eventMap, selectedDate, onDayPress, onPrev, onNext, styles, C }: MonthViewProps) {
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const monthName      = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });


  return (
    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navCircle} onPress={onPrev} accessibilityRole="button" accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={18} color={C.primary} />
        </TouchableOpacity>
        <View style={styles.monthTitleBlock}>
          <Text style={styles.monthTitle}>{monthName}</Text>
          <Text style={styles.monthYear}>{year}</Text>
        </View>
        <TouchableOpacity style={styles.navCircle} onPress={onNext} accessibilityRole="button" accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Day letters */}
      <View style={styles.weekLabelRow}>
        {DAY_LETTERS.map((l, i) => (
          <Text key={i} style={[styles.weekLabelText, (i === 0 || i === 6) && { color: C.primary + 'BB' }]}>
            {l}
          </Text>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.monthGrid}>
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <View key={`e${i}`} style={styles.monthCell} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1;
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isToday = isCurrentMonth && today.getDate() === day;
          const isSel   = toDateStr(selectedDate) === dateStr;
          const dayEvents = eventMap[dateStr] ?? [];
          const shown = dayEvents.slice(0, 2);
          const more = Math.max(0, dayEvents.length - 2);

          return (
            <TouchableOpacity key={day} style={styles.monthCell} onPress={() => onDayPress(day)} activeOpacity={0.65}>
              <View style={[styles.monthCircle, isToday && !isSel && styles.monthCircleToday, isSel && styles.monthCircleSel]}>
                <Text style={[
                  styles.monthDayNum,
                  isToday && !isSel && styles.monthDayNumToday,
                  isSel && styles.monthDayNumSel,
                ]}>
                  {day}
                </Text>
              </View>
              <View style={styles.cellLines}>
                {shown.map((ev: CalEvent) => (
                  <View key={ev.key} style={styles.cellLine}>
                    <View style={[styles.cellDash, { backgroundColor: ev.colorHex }]} />
                    {/* The NAME first. A calendar is scanned for recognition —
                        "Hydro" tells you more at a glance than "$84" does. */}
                    <Text style={styles.cellText} numberOfLines={1}>{ev.title}</Text>
                  </View>
                ))}
                {/* With only one thing on a day there is room to say how much,
                    or that it is already settled. */}
                {shown.length === 1 && (shown[0].amount != null || shown[0].subtitle) && (
                  <Text style={styles.cellSub} numberOfLines={1}>
                    {shown[0].subtitle && /^Paid/.test(shown[0].subtitle)
                      // Already settled: the word is the whole story, and the
                      // amount would only invite reading it as money owed.
                      ? shown[0].subtitle
                      // Otherwise both: how much, and whose job it is. "Due"
                      // and "Auto" are the distinction the auto-pay work exists
                      // for, and a calendar that hides it is back to guessing.
                      : [shown[0].amount != null ? shortMoney(shown[0].amount) : null, shown[0].subtitle]
                          .filter(Boolean).join(' · ')}
                  </Text>
                )}
                {more > 0 && <Text style={styles.cellMore}>+{more}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {([
          { color: C.income,   label: 'Payday' },
          { color: C.bills,    label: 'Bills' },
          { color: C.spending, label: 'Spending' },
          { color: C.goals,    label: 'Goal' },
          { color: C.primary,  label: 'Reminder' },
        ] as { color: string; label: string }[]).map(({ color, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.pip, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Week View
// ─────────────────────────────────────────────
interface WeekViewProps {
  weekStart: Date; today: Date;
  eventMap: EventMap; selectedDate: Date;
  onDayPress: (d: Date) => void;
  onPrevWeek: () => void; onNextWeek: () => void;
  onAddReminder: () => void;
  styles: Styles; C: ColorPalette;
}

function WeekView({ weekStart, today, eventMap, selectedDate, onDayPress, onPrevWeek, onNextWeek, onAddReminder, styles, C }: WeekViewProps) {
  const days = getWeekDays(weekStart);

  const getPips = (d: Date) => {
    const ev = eventMap[toDateStr(d)] ?? [];
    const types = new Set(ev.map(e => e.type));
    const pips: string[] = [];
    if (types.has('payday') || types.has('income')) pips.push(C.income);
    if (types.has('bill')   || types.has('sub'))    pips.push(C.bills);
    if (types.has('expense'))                        pips.push(C.spending);
    if (types.has('goal'))                           pips.push(C.goals);
    if (types.has('reminder'))                       pips.push(C.primary);
    return pips.slice(0, 3);
  };

  const selEvents = eventMap[toDateStr(selectedDate)] ?? [];

  return (
    <View style={{ flex: 1 }}>
      {/* Week range nav */}
      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.navCircle} onPress={onPrevWeek} accessibilityRole="button" accessibilityLabel="Previous week">
          <Ionicons name="chevron-back" size={18} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.weekRangeLabel}>{weekRangeLabel(weekStart)}</Text>
        <TouchableOpacity style={styles.navCircle} onPress={onNextWeek} accessibilityRole="button" accessibilityLabel="Next week">
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* 7-day strip */}
      <View style={styles.weekStrip}>
        {days.map((d, i) => {
          const isToday = isSameDay(d, today);
          const isSel   = isSameDay(d, selectedDate);
          const pips    = getPips(d);

          return (
            <TouchableOpacity
              key={i}
              style={[styles.weekCard, isToday && !isSel && styles.weekCardToday, isSel && styles.weekCardSel]}
              onPress={() => onDayPress(d)}
              activeOpacity={0.7}
            >
              <Text style={[styles.weekCardLetter, isSel && styles.weekCardTextSel, isToday && !isSel && { color: C.primary }]}>
                {DAY_SHORT[i].charAt(0)}
              </Text>
              <Text style={[styles.weekCardNum, isSel && styles.weekCardNumSel, isToday && !isSel && styles.weekCardNumToday]}>
                {d.getDate()}
              </Text>
              <View style={styles.weekPipsRow}>
                {pips.map((color, idx) => (
                  <View key={idx} style={[styles.weekPip, { backgroundColor: isSel ? 'rgba(255,255,255,0.7)' : color }]} />
                ))}
                {pips.length === 0 && <View style={styles.weekPip} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day events */}
      <ScrollView style={styles.weekDetail} contentContainerStyle={styles.weekDetailContent} showsVerticalScrollIndicator={false}>
        <EventList date={selectedDate} events={selEvents} onAddReminder={onAddReminder} styles={styles} C={C} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// Day View
// ─────────────────────────────────────────────
interface DayViewProps {
  date: Date; events: CalEvent[];
  onPrev: () => void; onNext: () => void;
  onAddReminder: () => void;
  styles: Styles; C: ColorPalette;
}

function DayView({ date, events, onPrev, onNext, onAddReminder, styles, C }: DayViewProps) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.dayNavBar}>
        <TouchableOpacity style={styles.navCircle} onPress={onPrev} accessibilityRole="button" accessibilityLabel="Previous day">
          <Ionicons name="chevron-back" size={18} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.dayNavLabel}>
          {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity style={styles.navCircle} onPress={onNext} accessibilityRole="button" accessibilityLabel="Next day">
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.dayScroll} showsVerticalScrollIndicator={false}>
        <EventList date={date} events={events} onAddReminder={onAddReminder} styles={styles} C={C} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────
export default function CalendarScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C      = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const today  = useMemo(() => new Date(), []);

  const [view,         setView]         = useState<CalView>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekStart,    setWeekStart]    = useState<Date>(getWeekStart(today));
  const [viewMonth,    setViewMonth]    = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [eventMap,     setEventMap]     = useState<EventMap>({});

  // Reminder modal
  const [addVisible,      setAddVisible]      = useState(false);
  const [addDate,         setAddDate]         = useState('');
  const [addTime,         setAddTime]         = useState('09:00');
  const [addTitle,        setAddTitle]        = useState('');
  const [addSaving,       setAddSaving]       = useState(false);
  const [titleFocused,    setTitleFocused]    = useState(false);

  // ── Load data for viewed month ──
  const loadData = useCallback(async () => {
    try {
      const db  = await getDatabase();
      const { year, month } = viewMonth;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startStr    = `${year}-${pad(month + 1)}-01`;
      const endStr      = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

      const [bills, subs, expenses, incomes, goals, reminders, paydaySetting, schedules, payments] = await Promise.all([
        db.getAllAsync<Bill>(`SELECT * FROM bills`),
        db.getAllAsync<Subscription>(`SELECT * FROM subscriptions`),
        db.getAllAsync<Expense>(`SELECT * FROM expenses WHERE date >= ? AND date <= ?`, [startStr, endStr]),
        db.getAllAsync<{ id: number; amount: number; label?: string; date: string }>(
          `SELECT * FROM income WHERE date >= ? AND date <= ?`, [startStr, endStr]
        ),
        db.getAllAsync<SavingsGoal>(`SELECT * FROM savings_goals WHERE deadline IS NOT NULL`),
        db.getAllAsync<CalReminder>(
          `SELECT * FROM calendar_reminders WHERE date >= ? AND date <= ?`, [startStr, endStr]
        ),
        db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE key = 'payday'`),
        activeSchedules(db),
        db.getAllAsync<any>(`SELECT source, bill_id, cycle_date, paid, paid_at, amount, status FROM bill_payments`)
          .catch(() => []),
      ]);

      const map: EventMap = {};
      const add = (dateStr: string, ev: CalEvent) => {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(ev);
      };

      // Payday.
      //
      // This used to read settings.payday -- a bare day-of-month -- and ignore
      // pay frequency entirely, so someone paid every second Friday saw a single
      // monthly marker on the wrong day. The Calendar disagreed with the Income
      // screen about the same paycheque.
      //
      // Income schedules are the canonical answer, and occurrencesBetween is the
      // same function the Income screen uses, so the two cannot drift apart.
      // No new payday arithmetic is introduced here.
      const monthStartDate = new Date(year, month, 1);
      const monthEndDate = new Date(year, month + 1, 0);
      if (schedules.length) {
        for (const s of schedules) {
          for (const iso of occurrencesBetween(s, monthStartDate, monthEndDate)) {
            add(iso, {
              key: 'payday-' + s.id + '-' + iso,
              type: 'payday',
              title: s.label || 'Payday',
              amount: s.amount,
              colorHex: C.income,
            });
          }
        }
      } else if (paydaySetting) {
        // Nobody has set up a schedule yet, so fall back to the older single
        // payday setting rather than showing them nothing.
        const pd = parseInt(paydaySetting.value, 10) || 1;
        add(`${year}-${pad(month + 1)}-${pad(dueDayInMonth(pd, year, month))}`,
          { key: 'payday', type: 'payday', title: 'Payday', colorHex: C.income });
      }

      // BILLS AND SUBSCRIPTIONS, and whether they were actually PAID.
      //
      // This used to draw every occurrence as though it were still owed,
      // because the Calendar never read bill_payments. buildMonth is the one
      // place that decides what an occurrence means — including a bill paid
      // early, where the money belongs on the day it moved and the occurrence
      // belongs on its due date, with the amount shown only once.
      const derived = buildMonth({
        year, month, today: toDateStr(new Date()),
        bills: bills as any, subscriptions: subs as any,
        payments: payments as any,
        expenses: [], income: [],      // added below, with their own colours
        paydays: [],                   // schedules already handled above
      });

      const STATE_WORD: Record<string, string> = {
        due: 'Due', auto: 'Auto', paid: 'Paid',
        paidEarly: 'Paid early', paidLate: 'Paid late',
        expected: 'Expected', actual: '',
      };

      for (const [iso, entries] of derived) {
        for (const e of entries as CalendarEntry[]) {
          add(iso, {
            key: e.key,
            type: e.kind === 'subscription' ? 'sub' : 'bill',
            title: e.label,
            subtitle: STATE_WORD[e.state] || undefined,
            amount: e.amount,
            colorHex: e.kind === 'subscription' ? C.subs : C.bills,
          });
        }
      }

      // Weekly bills recur every week, which is a weekday walk rather than a
      // monthly occurrence, so they stay here.
      for (const bill of bills) {
        if (bill.frequency !== 'weekly' || bill.due_weekday === undefined) continue;
        for (let d = 1; d <= daysInMonth; d++) {
          if (new Date(year, month, d).getDay() === bill.due_weekday) {
            add(`${year}-${pad(month + 1)}-${pad(d)}`,
              { key: `bill-${bill.id}-${d}`, type: 'bill', title: bill.name,
                subtitle: methodOf(bill as any, 'manual') === 'auto' ? 'Auto' : 'Due',
                amount: bill.amount, colorHex: C.bills });
          }
        }
      }

      // Expenses
      for (const exp of expenses) {
        add(exp.date,
          { key: `exp-${exp.id}`, type: 'expense', title: exp.note || exp.category, amount: exp.amount, colorHex: C.spending });
      }

      // Income
      for (const inc of incomes) {
        add(inc.date,
          { key: `inc-${inc.id}`, type: 'income', title: inc.label || 'Income', amount: inc.amount, colorHex: C.income });
      }

      // Goal deadlines
      for (const goal of goals) {
        if (!goal.deadline) continue;
        const [gy, gm] = goal.deadline.split('-').map(Number);
        if (gy === year && gm === month + 1) {
          add(goal.deadline, {
            key: `goal-${goal.id}`, type: 'goal',
            title: goal.name,
            subtitle: `${formatCurrency(goal.current_amount)} of ${formatCurrency(goal.target_amount)}`,
            colorHex: C.goals,
          });
        }
      }

      // Reminders
      for (const rem of reminders) {
        add(rem.date,
          { key: `rem-${rem.id}`, type: 'reminder', title: rem.title, colorHex: C.primary, time: rem.time });
      }

      setEventMap(map);
    } catch (e) {
      console.error('[Calendar] loadData error:', e);
    }
  }, [viewMonth, C]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Navigation ──
  const prevMonth = () => setViewMonth(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setViewMonth(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });

  const prevDay = () => setSelectedDate(d => shiftDay(d, -1));
  const nextDay = () => setSelectedDate(d => shiftDay(d, 1));

  const prevWeek = () => {
    const ns = shiftDay(weekStart, -7);
    setWeekStart(ns);
    setViewMonth({ year: ns.getFullYear(), month: ns.getMonth() });
  };
  const nextWeek = () => {
    const ns = shiftDay(weekStart, 7);
    setWeekStart(ns);
    setViewMonth({ year: ns.getFullYear(), month: ns.getMonth() });
  };

  // Tap day in month → switch to day view
  const onMonthDayPress = (day: number) => {
    const d = new Date(viewMonth.year, viewMonth.month, day);
    setSelectedDate(d);
    setWeekStart(getWeekStart(d));
    setView('day');
  };

  // Tap day in week strip → select that day
  const onWeekDayPress = (d: Date) => {
    setSelectedDate(d);
  };

  // ── Reminder modal ──
  const openAddReminder = (date: Date) => {
    setAddDate(toDateStr(date));
    setAddTime('09:00');
    setAddTitle('');
    setAddVisible(true);
  };

  const saveReminder = async () => {
    if (!addTitle.trim()) return;
    setAddSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO calendar_reminders (date, time, title) VALUES (?, ?, ?)`,
        [addDate, addTime, addTitle.trim()]
      );
      setAddVisible(false);
      setAddTitle('');
      await loadData();
    } catch (e) {
      console.error('[Calendar] saveReminder error:', e);
    } finally {
      setAddSaving(false);
    }
  };

  const selEvents = eventMap[toDateStr(selectedDate)] ?? [];

  return (
    <PeggyScreen scroll={false} padded={false} contentStyle={styles.shell}>

      {/* ── Header ── */}
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-down" size={22} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Calendar</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* ── Segmented control ── */}
      <View style={styles.segWrap}>
        {(['day', 'week', 'month'] as CalView[]).map(v => (
          <TouchableOpacity
            key={v}
            style={[styles.segBtn, view === v && styles.segBtnActive]}
            onPress={() => setView(v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.segLabel, view === v && styles.segLabelActive]}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Views ── */}
      {view === 'month' && (
        <MonthView
          year={viewMonth.year} month={viewMonth.month} today={today}
          eventMap={eventMap} selectedDate={selectedDate}
          onDayPress={onMonthDayPress} onPrev={prevMonth} onNext={nextMonth}
          styles={styles} C={C}
        />
      )}
      {view === 'week' && (
        <WeekView
          weekStart={weekStart} today={today}
          eventMap={eventMap} selectedDate={selectedDate}
          onDayPress={onWeekDayPress}
          onPrevWeek={prevWeek} onNextWeek={nextWeek}
          onAddReminder={() => openAddReminder(selectedDate)}
          styles={styles} C={C}
        />
      )}
      {view === 'day' && (
        <DayView
          date={selectedDate} events={selEvents}
          onPrev={prevDay} onNext={nextDay}
          onAddReminder={() => openAddReminder(selectedDate)}
          styles={styles} C={C}
        />
      )}

      {/* ── Add reminder modal ── */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddVisible(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Reminder</Text>
            <Text style={styles.modalSub}>{addDate}</Text>

            <TextInput
              style={[styles.modalInput, titleFocused && { borderColor: C.primary }]}
              placeholder="What do you want to remember?"
              placeholderTextColor={C.textHint}
              value={addTitle}
              onChangeText={setAddTitle}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              autoFocus
              maxLength={80}
            />

            <Text style={styles.modalTimeHeading}>Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll} contentContainerStyle={styles.timeScrollContent}>
              {QUICK_TIMES.map(t => {
                const h = parseInt(t.split(':')[0], 10);
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, addTime === t && styles.timeChipActive]}
                    onPress={() => setAddTime(t)}
                  >
                    <Text style={[styles.timeChipText, addTime === t && styles.timeChipTextActive]}>
                      {fmtHour(h)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSaveBtn, !addTitle.trim() && { opacity: 0.38 }]}
              onPress={saveReminder}
              disabled={!addTitle.trim() || addSaving}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSaveBtnText}>{addSaving ? 'Saving…' : 'Save Reminder'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </PeggyScreen>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    // PeggyScreen owns the background and safe-area inset.
    shell: { flex: 1, paddingBottom: 0 },

    // Header
    screenHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      backgroundColor: C.bgCard,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    screenTitle: { ...Typography.h3, color: C.textPrimary },

    // Shared nav circle button
    navCircle: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.primary + '18',
      alignItems: 'center', justifyContent: 'center',
    },

    // Segmented control
    segWrap: {
      flexDirection: 'row',
      margin: Spacing.md,
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1, borderColor: C.border,
      padding: 4,
    },
    segBtn:         { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.md },
    segBtnActive:   { backgroundColor: C.primary },
    segLabel:       { ...Typography.smallBold, color: C.textHint },
    segLabelActive: { ...Typography.smallBold, color: C.textOnPrimary },

    // ── Month view ──
    monthNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingTop: 4, paddingBottom: Spacing.md,
    },
    monthTitleBlock: { alignItems: 'center' },
    monthTitle:      { ...Typography.h2, color: C.textPrimary, fontSize: 22, letterSpacing: -0.3 },
    monthYear:       { ...Typography.caption, color: C.textHint, marginTop: 1 },

    weekLabelRow:  { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingBottom: 6 },
    weekLabelText: {
      flex: 1, textAlign: 'center',
      fontSize: 13, fontWeight: '700', color: C.textHint, letterSpacing: 0.4,
    },

    monthGrid:       { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md },
    monthCell:       { width: '14.28%', alignItems: 'center', paddingVertical: 3 },
    monthCircle:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    monthCircleToday: { borderWidth: 2, borderColor: C.primary },
    monthCircleSel:  { backgroundColor: C.primary },
    monthDayNum:     { fontFamily: 'DMSans_300Light', fontSize: 16, color: C.textPrimary },
    monthDayNumToday: { fontFamily: 'DMSans_700Bold', color: C.primary },
    monthDayNumSel:  { fontFamily: 'DMSans_700Bold', color: C.textOnPrimary },

    // A day now reads as words. The coloured dash is a hint about WHICH kind

    // of money it is; the text is what the person actually reads, so nothing

    // here depends on telling colours apart.

    cellLines:  { width: '100%', paddingHorizontal: 2, gap: 1, minHeight: 26 },

    cellLine:   { flexDirection: 'row', alignItems: 'center', gap: 2 },

    cellDash:   { width: 3, height: 3, borderRadius: 2 },

    cellText:   { fontSize: 9, lineHeight: 11, color: C.textSecondary, flex: 1 },

    cellSub:    { fontSize: 8, lineHeight: 10, color: C.textHint, paddingLeft: 5 },
    cellMore:   { fontSize: 8, lineHeight: 10, color: C.textHint, paddingLeft: 5 },

    pipsRow:    { flexDirection: 'row', gap: 2, height: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    pip:        { width: 5, height: 5, borderRadius: 3 },
    pipSpacer:  { width: 5, height: 5 },

    legend: {
      flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
      gap: 14, paddingHorizontal: Spacing.lg, paddingVertical: 14,
      borderTopWidth: 1, borderTopColor: C.border, marginTop: 4,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendText: { ...Typography.caption, color: C.textSecondary },

    // ── Week view ──
    weekNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    },
    weekRangeLabel: { ...Typography.smallBold, color: C.textPrimary },

    weekStrip: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      gap: 5,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    weekCard: {
      flex: 1, alignItems: 'center',
      paddingVertical: 10, borderRadius: 14,
      backgroundColor: C.bgCard,
      borderWidth: 1, borderColor: C.border,
      gap: 2,
    },
    weekCardToday: { borderColor: C.primary, borderWidth: 1.5 },
    weekCardSel:   { backgroundColor: C.primary, borderColor: C.primary },
    weekCardLetter: {
      fontSize: 13, fontWeight: '700',
      color: C.textHint, letterSpacing: 0.5,
    },
    weekCardTextSel: { color: C.textOnPrimary },
    weekCardNum:    { fontFamily: 'DMSans_400Regular', fontSize: 18, color: C.textPrimary },
    weekCardNumToday: { fontFamily: 'DMSans_700Bold', color: C.primary },
    weekCardNumSel: { fontFamily: 'DMSans_700Bold', color: C.textOnPrimary },
    weekPipsRow:    { flexDirection: 'row', gap: 2, height: 6, alignItems: 'center', marginTop: 1 },
    weekPip:        { width: 4, height: 4, borderRadius: 2 },

    weekDetail:        { flex: 1 },
    weekDetailContent: { padding: Spacing.md, paddingBottom: 48 },

    // ── Day view ──
    dayNavBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    dayNavLabel: { ...Typography.smallBold, color: C.textPrimary },
    dayScroll:   { padding: Spacing.md, paddingBottom: 48 },

    // ── Shared EventList styles ──
    detailDateRow: { marginBottom: Spacing.md },
    detailWeekday: { ...Typography.h3, color: C.textPrimary },
    detailDateStr: { ...Typography.small, color: C.textSecondary, marginTop: 2 },

    emptyState: {
      alignItems: 'center', justifyContent: 'center',
      paddingVertical: Spacing.xl, gap: 8,
    },
    emptyTitle: { ...Typography.bodyBold, color: C.textSecondary },
    emptyText:  { ...Typography.small, color: C.textHint },

    eventSection:      { marginBottom: Spacing.md },
    eventSectionLabel: {
      ...Typography.label, color: C.textHint,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm,
    },
    eventCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard,
      borderRadius: Radius.md,
      borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 3,
      paddingHorizontal: Spacing.md, paddingVertical: 13,
      marginBottom: 8, gap: Spacing.sm,
    },
    eventIcon:  { width: 34, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    eventBody:  { flex: 1 },
    eventTitle: { ...Typography.bodyBold, color: C.textPrimary, fontSize: 15 },
    eventSub:   { ...Typography.caption, color: C.textSecondary, marginTop: 2 },
    eventAmt:   { ...Typography.smallBold },

    addReminderBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 13,
      borderWidth: 1.5, borderColor: C.primary + '38', borderStyle: 'dashed',
      borderRadius: Radius.md, marginTop: 4,
    },
    addReminderText: { ...Typography.smallBold, color: C.primary },

    // ── Reminder modal ──
    modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    modalSheet: {
      backgroundColor: C.bgElevated,
      borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    },
    modalHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.md,
    },
    modalTitle:       { ...Typography.h3, color: C.textPrimary, marginBottom: 2 },
    modalSub:         { ...Typography.caption, color: C.textHint, marginBottom: Spacing.md },
    modalInput: {
      backgroundColor: C.bgInput, borderRadius: Radius.md,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: Spacing.md, paddingVertical: 14,
      ...Typography.body, color: C.textPrimary,
      marginBottom: Spacing.md,
    },
    modalTimeHeading:    { ...Typography.smallBold, color: C.textSecondary, marginBottom: 10 },
    timeScroll:          { marginHorizontal: -Spacing.lg, marginBottom: Spacing.md },
    timeScrollContent:   { paddingHorizontal: Spacing.lg, gap: 8 },
    timeChip: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: Radius.full, backgroundColor: C.bgCard,
      borderWidth: 1, borderColor: C.border,
    },
    timeChipActive:     { backgroundColor: C.primary, borderColor: C.primary },
    timeChipText:       { ...Typography.smallBold, color: C.textSecondary },
    timeChipTextActive: { ...Typography.smallBold, color: C.textOnPrimary },
    modalSaveBtn: {
      backgroundColor: C.primary, borderRadius: Radius.lg,
      paddingVertical: 16, alignItems: 'center', marginBottom: Spacing.sm,
    },
    modalSaveBtnText: { ...Typography.bodyBold, color: C.textOnPrimary },
    modalCancelBtn:   { paddingVertical: Spacing.sm, alignItems: 'center' },
    modalCancelText:  { ...Typography.body, color: C.textHint },
  });
}
