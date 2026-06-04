import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface CurrencyRate {
  code: string;
  name: string;
  rate_to_usd: number;
  synced_rate: number;
  is_overridden: number;
  flag: string;
}

interface Conversion {
  id?: number;
  from_code: string;
  to_code: string;
  from_amount: number;
  to_amount: number;
  created_at?: string;
}

interface CurrencyPickerProps {
  rates: CurrencyRate[];
  current: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  styles: ReturnType<typeof makeStyles>;
}

function CurrencyPicker({ rates, current, onSelect, onClose, styles }: CurrencyPickerProps) {
  return (
    <Modal transparent animationType="slide">
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>Select Currency</Text>
          <FlatList
            data={rates}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerRow, item.code === current && styles.pickerRowActive]}
                onPress={() => { onSelect(item.code); onClose(); }}
              >
                <Text style={styles.pickerFlag}>{item.flag}</Text>
                <View style={styles.pickerMiddle}>
                  <Text style={styles.pickerCode}>{item.code}</Text>
                  <Text style={styles.pickerName}>{item.name}</Text>
                </View>
                <Text style={styles.pickerRateText}>= {item.rate_to_usd} USD</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.pickerClose} onPress={onClose}>
            <Text style={styles.pickerCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const DEFAULT_RATES: CurrencyRate[] = [
  { code: 'USD', name: 'US Dollar',         rate_to_usd: 1.0,    synced_rate: 1.0,    is_overridden: 0, flag: '🇺🇸' },
  { code: 'CAD', name: 'Canadian Dollar',   rate_to_usd: 0.74,   synced_rate: 0.74,   is_overridden: 0, flag: '🇨🇦' },
  { code: 'EUR', name: 'Euro',              rate_to_usd: 1.08,   synced_rate: 1.08,   is_overridden: 0, flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound',     rate_to_usd: 1.27,   synced_rate: 1.27,   is_overridden: 0, flag: '🇬🇧' },
  { code: 'AUD', name: 'Australian Dollar', rate_to_usd: 0.65,   synced_rate: 0.65,   is_overridden: 0, flag: '🇦🇺' },
  { code: 'MXN', name: 'Mexican Peso',      rate_to_usd: 0.058,  synced_rate: 0.058,  is_overridden: 0, flag: '🇲🇽' },
  { code: 'JPY', name: 'Japanese Yen',      rate_to_usd: 0.0067, synced_rate: 0.0067, is_overridden: 0, flag: '🇯🇵' },
  { code: 'INR', name: 'Indian Rupee',      rate_to_usd: 0.012,  synced_rate: 0.012,  is_overridden: 0, flag: '🇮🇳' },
  { code: 'CNY', name: 'Chinese Yuan',      rate_to_usd: 0.138,  synced_rate: 0.138,  is_overridden: 0, flag: '🇨🇳' },
  { code: 'BRL', name: 'Brazilian Real',    rate_to_usd: 0.20,   synced_rate: 0.20,   is_overridden: 0, flag: '🇧🇷' },
  { code: 'PHP', name: 'Philippine Peso',   rate_to_usd: 0.017,  synced_rate: 0.017,  is_overridden: 0, flag: '🇵🇭' },
  { code: 'CHF', name: 'Swiss Franc',       rate_to_usd: 1.12,   synced_rate: 1.12,   is_overridden: 0, flag: '🇨🇭' },
];

async function setupCurrencyTables(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS currency_rates (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rate_to_usd REAL NOT NULL,
      synced_rate REAL NOT NULL DEFAULT 0,
      is_overridden INTEGER NOT NULL DEFAULT 0,
      flag TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversion_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_code TEXT NOT NULL,
      to_code TEXT NOT NULL,
      from_amount REAL NOT NULL,
      to_amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const migrations = [
    `ALTER TABLE currency_rates ADD COLUMN synced_rate REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE currency_rates ADD COLUMN is_overridden INTEGER NOT NULL DEFAULT 0`,
  ];
  for (const sql of migrations) {
    try { await db.execAsync(sql + ';'); } catch {}
  }

  const count = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM currency_rates`);
  if ((count?.n ?? 0) === 0) {
    for (const r of DEFAULT_RATES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO currency_rates (code, name, rate_to_usd, synced_rate, is_overridden, flag) VALUES (?, ?, ?, ?, 0, ?)`,
        [r.code, r.name, r.rate_to_usd, r.rate_to_usd, r.flag]
      );
    }
  }
}

export default function CurrencyScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [history, setHistory] = useState<Conversion[]>([]);
  const [amount, setAmount] = useState('1');
  const [fromCode, setFromCode] = useState('USD');
  const [toCode, setToCode] = useState('CAD');
  const [result, setResult] = useState<number | null>(null);
  const [pickingFrom, setPickingFrom] = useState(false);
  const [pickingTo, setPickingTo] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingRate, setEditingRate] = useState<CurrencyRate | null>(null);
  const [editRateValue, setEditRateValue] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await setupCurrencyTables();
      const db = await getDatabase();
      const r = await db.getAllAsync<CurrencyRate>(`SELECT * FROM currency_rates ORDER BY code`);
      setRates(r ?? DEFAULT_RATES);
      const h = await db.getAllAsync<Conversion>(
        `SELECT * FROM conversion_history ORDER BY created_at DESC LIMIT 10`
      );
      setHistory(h ?? []);
      const ts = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = 'rates_last_updated'`
      );
      setLastUpdated(ts?.value ?? null);
    } catch (e) {
      console.error('[Currency] loadData error:', e);
      setRates(DEFAULT_RATES);
    }
  }, []);

  const fetchLiveRates = async () => {
    setSyncing(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('Network error');
      const json = await res.json();
      const live: Record<string, number> = json.rates;
      const db = await getDatabase();
      for (const [code, usdRate] of Object.entries(live)) {
        const rateToUsd = usdRate > 0 ? 1 / usdRate : 0;
        await db.runAsync(
          `UPDATE currency_rates SET synced_rate=?, rate_to_usd=CASE WHEN is_overridden=0 THEN ? ELSE rate_to_usd END, updated_at=datetime('now') WHERE code=?`,
          [rateToUsd, rateToUsd, code]
        );
      }
      const now = new Date().toLocaleString();
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('rates_last_updated', ?)`,
        [now]
      );
      setLastUpdated(now);
      loadData();
    } catch {
      Alert.alert('Could not update rates', 'Make sure you have an internet connection and try again.');
    } finally {
      setSyncing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const convert = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { Alert.alert('Oops', 'Please enter a valid amount.'); return; }

    const from = rates.find((r) => r.code === fromCode);
    const to = rates.find((r) => r.code === toCode);
    if (!from || !to) return;

    const inUsd = val * from.rate_to_usd;
    const converted = inUsd / to.rate_to_usd;
    setResult(converted);

    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO conversion_history (from_code, to_code, from_amount, to_amount) VALUES (?, ?, ?, ?)`,
      [fromCode, toCode, val, converted]
    );
    loadData();
  };

  const swap = () => {
    setFromCode(toCode);
    setToCode(fromCode);
    setResult(null);
  };

  const openEditRate = (rate: CurrencyRate) => {
    setEditingRate(rate);
    setEditRateValue(String(rate.rate_to_usd));
    setEditModal(true);
  };

  const saveRate = () => {
    if (!editingRate) return;
    const val = parseFloat(editRateValue);
    if (isNaN(val) || val <= 0) { Alert.alert('Oops', 'Please enter a valid rate.'); return; }

    Alert.alert(
      'Change exchange rate?',
      "You're changing the saved exchange rate. This may affect your calculations.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Custom Rate',
          onPress: async () => {
            const db = await getDatabase();
            await db.runAsync(
              `UPDATE currency_rates SET rate_to_usd=?, is_overridden=1, updated_at=datetime('now') WHERE code=?`,
              [val, editingRate.code]
            );
            setEditModal(false);
            loadData();
          },
        },
      ]
    );
  };

  const restoreRate = async (rate: CurrencyRate) => {
    Alert.alert(
      `Restore synced rate for ${rate.code}?`,
      `This will replace your custom rate with the last known default: ${rate.synced_rate} USD.`,
      [
        {
          text: 'Restore Synced Rate',
          onPress: async () => {
            const db = await getDatabase();
            await db.runAsync(
              `UPDATE currency_rates SET rate_to_usd=synced_rate, is_overridden=0, updated_at=datetime('now') WHERE code=?`,
              [rate.code]
            );
            loadData();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const fromRate = rates.find((r) => r.code === fromCode);
  const toRate = rates.find((r) => r.code === toCode);

  const formatAmount = (value: number): string => {
    if (value >= 1000) return value.toFixed(0);
    return value.toFixed(2);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Currency Calculator</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>Works offline. Tap any rate to edit manually.</Text>
          <TouchableOpacity style={[styles.syncBtn, syncing && { opacity: 0.5 }]} onPress={fetchLiveRates} disabled={syncing}>
            <Ionicons name="refresh-outline" size={14} color={C.primary} />
            <Text style={styles.syncBtnText}>{syncing ? 'Updating…' : 'Update Rates Now'}</Text>
          </TouchableOpacity>
        </View>
        {lastUpdated ? (
          <Text style={styles.lastUpdated}>Rates last updated: {lastUpdated}</Text>
        ) : null}

        <View style={styles.calcCard}>
          <Text style={styles.calcLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(v) => { setAmount(v); setResult(null); }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={C.textHint}
            />
          </View>

          <View style={styles.currencyRow}>
            <TouchableOpacity style={styles.currencyBtn} onPress={() => setPickingFrom(true)}>
              <Text style={styles.currencyFlag}>{fromRate?.flag ?? ''}</Text>
              <Text style={styles.currencyCode}>{fromCode}</Text>
              <Text style={styles.currencyName}>{fromRate?.name ?? ''}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.swapBtn} onPress={swap}>
              <Ionicons name="swap-horizontal-outline" size={22} color={C.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.currencyBtn} onPress={() => setPickingTo(true)}>
              <Text style={styles.currencyFlag}>{toRate?.flag ?? ''}</Text>
              <Text style={styles.currencyCode}>{toCode}</Text>
              <Text style={styles.currencyName}>{toRate?.name ?? ''}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.convertBtn} onPress={convert}>
            <Text style={styles.convertBtnText}>Convert</Text>
          </TouchableOpacity>

          {result !== null && (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>{amount} {fromCode} =</Text>
              <Text style={styles.resultAmount}>{formatAmount(result)} {toCode}</Text>
              <Text style={styles.resultNote}>Rate saved offline · Tap a currency to update it</Text>
            </View>
          )}
        </View>

        {history.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Conversions</Text>
            {history.slice(0, 5).map((h) => (
              <View key={h.id} style={styles.historyRow}>
                <Text style={styles.historyFrom}>
                  {h.from_amount.toFixed(2)} {h.from_code}
                </Text>
                <Text style={styles.historyArrow}> → </Text>
                <Text style={styles.historyTo}>
                  {formatAmount(h.to_amount)} {h.to_code}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exchange Rates</Text>
          <Text style={styles.cardSub}>Tap any row to update the rate manually</Text>
          {rates.map((rate) => (
            <TouchableOpacity key={rate.code} style={styles.rateRow} onPress={() => openEditRate(rate)}>
              <Text style={styles.rateFlag}>{rate.flag}</Text>
              <View style={styles.rateMiddle}>
                <View style={styles.rateCodeRow}>
                  <Text style={styles.rateCode}>{rate.code}</Text>
                  {rate.is_overridden === 1 && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>Custom rate</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.rateName}>{rate.name}</Text>
              </View>
              <View style={styles.rateRight}>
                <Text style={styles.rateValue}>= {formatAmount(rate.rate_to_usd)} USD</Text>
                {rate.is_overridden === 1 ? (
                  <TouchableOpacity onPress={() => restoreRate(rate)}>
                    <Text style={styles.restoreHint}>Restore synced rate</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.editHint}>tap to edit</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {pickingFrom && <CurrencyPicker rates={rates} current={fromCode} onSelect={(c) => { setFromCode(c); setResult(null); }} onClose={() => setPickingFrom(false)} styles={styles} />}
      {pickingTo && <CurrencyPicker rates={rates} current={toCode} onSelect={(c) => { setToCode(c); setResult(null); }} onClose={() => setPickingTo(false)} styles={styles} />}

      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingRate?.flag} Update {editingRate?.code} Rate
            </Text>
            <Text style={styles.modalSub}>{editingRate?.name}</Text>
            <Text style={styles.modalLabel}>
              How many USD does 1 {editingRate?.code} equal?
            </Text>
            <View style={styles.editAmountRow}>
              <Text style={styles.editPrefix}>1 {editingRate?.code} = </Text>
              <TextInput
                style={styles.editInput}
                value={editRateValue}
                onChangeText={setEditRateValue}
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={styles.editSuffix}> USD</Text>
            </View>
            <Text style={styles.modalHint}>
              Example: if $1 CAD = $0.74 USD, type 0.74
            </Text>
            <TouchableOpacity style={styles.saveBtn} onPress={saveRate}>
              <Text style={styles.saveBtnText}>Save Rate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:       { flex: 1, backgroundColor: C.bg },
    content:         { padding: Spacing.md, paddingTop: Spacing.md },

    backRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, gap: 4 },
    backText:        { ...Typography.small, color: C.textSecondary },

    title:           { ...Typography.h1, color: C.textPrimary, marginBottom: 4 },
    subtitleRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    subtitle:        { ...Typography.small, color: C.textSecondary, flex: 1 },
    syncBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: C.primary + '18', borderWidth: 1, borderColor: C.primary + '40' },
    syncBtnText:     { ...Typography.caption, color: C.primary, fontWeight: '600' },
    lastUpdated:     { ...Typography.caption, color: C.textHint, marginBottom: Spacing.md },

    calcCard:        { backgroundColor: C.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: C.border },
    calcLabel:       { ...Typography.caption, color: C.textSecondary, marginBottom: Spacing.sm },
    amountRow:       { marginBottom: Spacing.md },
    amountInput:     { backgroundColor: C.bg, borderRadius: Radius.md, padding: Spacing.md, color: C.textPrimary, fontSize: 30, fontWeight: '700', borderWidth: 1, borderColor: C.border },

    currencyRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
    currencyBtn:     { flex: 1, backgroundColor: C.bg, borderRadius: Radius.md, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    currencyFlag:    { fontSize: 28, marginBottom: 4 },
    currencyCode:    { ...Typography.h3, color: C.textPrimary },
    currencyName:    { ...Typography.caption, color: C.textSecondary, textAlign: 'center', marginTop: 2 },
    swapBtn:         { backgroundColor: C.primary + '18', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.primary + '50' },

    convertBtn:      { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
    convertBtnText:  { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },

    resultBox:       { backgroundColor: C.primary + '14', borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: C.primary + '40' },
    resultLabel:     { ...Typography.caption, color: C.textSecondary, marginBottom: 4 },
    resultAmount:    { ...Typography.hero, color: C.textPrimary, fontSize: 32 },
    resultNote:      { ...Typography.caption, color: C.textHint, marginTop: 6 },

    card:            { backgroundColor: C.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: C.border },
    cardTitle:       { ...Typography.bodyBold, color: C.textPrimary, marginBottom: 4 },
    cardSub:         { ...Typography.caption, color: C.textSecondary, marginBottom: Spacing.md },

    historyRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    historyFrom:     { ...Typography.body, color: C.textSecondary },
    historyArrow:    { ...Typography.bodyBold, color: C.primary, marginHorizontal: 4 },
    historyTo:       { ...Typography.bodyBold, color: C.textPrimary },

    rateRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    rateFlag:        { fontSize: 24, marginRight: 12 },
    rateMiddle:      { flex: 1 },
    rateCodeRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rateCode:        { ...Typography.bodyBold, color: C.textPrimary },
    rateName:        { ...Typography.caption, color: C.textSecondary },
    rateRight:       { alignItems: 'flex-end' },
    rateValue:       { ...Typography.caption, color: C.income, fontWeight: '600' },
    editHint:        { ...Typography.caption, color: C.textHint, marginTop: 2 },
    customBadge:     { backgroundColor: C.primary + '25', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
    customBadgeText: { color: C.primary, fontSize: 10, fontWeight: '700' },
    restoreHint:     { ...Typography.caption, color: C.primary, marginTop: 2 },

    pickerOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    pickerCard:      { backgroundColor: C.bgElevated, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '80%', padding: Spacing.lg },
    pickerTitle:     { ...Typography.h2, color: C.textPrimary, marginBottom: Spacing.md },
    pickerRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    pickerRowActive: { backgroundColor: C.primary + '14' },
    pickerFlag:      { fontSize: 24, marginRight: 12 },
    pickerMiddle:    { flex: 1 },
    pickerCode:      { ...Typography.bodyBold, color: C.textPrimary },
    pickerName:      { ...Typography.small, color: C.textSecondary },
    pickerRateText:  { ...Typography.caption, color: C.textHint },
    pickerClose:     { marginTop: Spacing.md, backgroundColor: C.border, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
    pickerCloseText: { ...Typography.body, color: C.textPrimary },

    modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard:       { backgroundColor: C.bgElevated, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, paddingBottom: 50 },
    modalTitle:      { ...Typography.h2, color: C.textPrimary, marginBottom: 4 },
    modalSub:        { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.lg },
    modalLabel:      { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.sm },
    editAmountRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.sm },
    editPrefix:      { ...Typography.body, color: C.textSecondary },
    editInput:       { flex: 1, fontSize: 24, color: C.textPrimary, paddingVertical: 14, fontWeight: '700', textAlign: 'center' },
    editSuffix:      { ...Typography.body, color: C.textSecondary },
    modalHint:       { ...Typography.caption, color: C.textHint, marginBottom: Spacing.lg },
    saveBtn:         { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center' },
    saveBtnText:     { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
    cancelBtn:       { marginTop: 10, paddingVertical: 14, alignItems: 'center' },
    cancelBtnText:   { ...Typography.body, color: C.textSecondary },
  });
}
