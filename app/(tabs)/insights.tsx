import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../store/useAuthStore';
import { useExpensesStore } from '../../store/useExpensesStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { generateInsights, Insight, InsightsData } from '../../services/gemini';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import { SparklesIcon } from '../../components/Icons';

// ─── Types ────────────────────────────────────────────────────────
type InsightHistory = {
  id: string;
  generatedAt: string;
  insights: Insight[];
  todaySales: number;
  todayExpenses: number;
  netProfit: number;
  orders: number;
};

// ─── Type badge config ────────────────────────────────────────────
const TYPE_CONFIG: Record<Insight['type'], { bg: string; border: string; color: string; label: string }> = {
  success: { bg: Colors.successSoft, border: Colors.success, color: Colors.success, label: 'GOOD' },
  warning: { bg: Colors.warningSoft, border: Colors.warning, color: Colors.warning, label: 'ALERT' },
  tip:     { bg: Colors.primarySoft, border: Colors.primary, color: Colors.primary, label: 'TIP' },
  info:    { bg: Colors.infoSoft,    border: Colors.info,    color: Colors.info,    label: 'INFO' },
};

// ─── Insight Card ─────────────────────────────────────────────────
const InsightCard = ({ insight }: { insight: Insight }) => {
  const cfg = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.info;
  return (
    <View style={s.card}>
      <View style={[s.cardBar, { backgroundColor: cfg.border }]} />
      <View style={s.cardContent}>
        <View style={s.cardHead}>
          <View style={[s.typeBadge, { backgroundColor: cfg.border }]}>
            <Text style={s.typeBadgeText}>{cfg.label}</Text>
          </View>
          <Text style={[s.cardTitle, { color: cfg.color }]}>{insight.title}</Text>
        </View>
        <Text style={s.cardBody}>{insight.body}</Text>
      </View>
    </View>
  );
};

// ─── History Item ─────────────────────────────────────────────────
const HistoryItem = ({ item }: { item: InsightHistory }) => {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(item.generatedAt);
  const dateStr = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <View style={s.historyCard}>
      <TouchableOpacity style={s.historyHead} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
        <View>
          <Text style={s.historyDate}>{dateStr}</Text>
          <Text style={s.historySummary}>
            Sales ₱{item.todaySales.toLocaleString()} · Profit ₱{Math.abs(item.netProfit).toLocaleString()}
            {item.netProfit < 0 ? ' (Loss)' : ''} · {item.orders} orders
          </Text>
        </View>
        <Text style={s.historyChevron}>{expanded ? '−' : '+'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={s.historyExpanded}>
          {item.insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
        </View>
      )}
    </View>
  );
};

const HISTORY_KEY = 'kita_insights_history';
const SNAPSHOT_KEY = 'kita_insights_snapshot';
const MAX_HISTORY = 10;

function makeFingerprint(data: InsightsData): string {
  return JSON.stringify({
    todaySales: data.todaySales,
    todayExpenses: data.todayExpenses,
    weekSales: data.weekSales,
    orders: data.orders,
    lowStock: data.lowStock.map(i => `${i.name}:${i.stock}`).sort(),
    topItems: data.topItems.map(i => `${i.name}:${i.count}`).sort(),
  });
}

// ─── Insights Tab Screen ──────────────────────────────────────────
export default function InsightsTab() {
  const { user } = useAuthStore();
  const { items: expenseItems } = useExpensesStore();
  const { items: stockItems } = useInventoryStore();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);
  const [noChange, setNoChange] = useState(false);
  const [summaryData, setSummaryData] = useState<InsightsData | null>(null);
  const [history, setHistory] = useState<InsightHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then(raw => { if (raw) setHistory(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const saveToHistory = async (data: InsightsData, result: Insight[]) => {
    const entry: InsightHistory = {
      id: Date.now().toString(),
      generatedAt: new Date().toISOString(),
      insights: result,
      todaySales: data.todaySales,
      todayExpenses: data.todayExpenses,
      netProfit: data.netProfit,
      orders: data.orders,
    };
    const updated = [entry, ...history].slice(0, MAX_HISTORY);
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const fetchAndGenerate = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const snap = await getDocs(query(
        collection(db, 'orders', user.uid, 'transactions'),
        where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
        orderBy('createdAt', 'asc'),
      ));

      let weekSales = 0, todaySales = 0, orders = 0;
      const itemMap: Record<string, { name: string; count: number; revenue: number }> = {};
      const dayMap: Record<string, number> = {};
      const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      snap.forEach(doc => {
        const data = doc.data();
        const date = (data.createdAt as Timestamp).toDate();
        weekSales += data.total;
        const dayKey = DAY[date.getDay()];
        dayMap[dayKey] = (dayMap[dayKey] ?? 0) + data.total;
        if (date >= todayStart) {
          todaySales += data.total; orders++;
          (data.items || []).forEach((item: any) => {
            if (!itemMap[item.id]) itemMap[item.id] = { name: item.name, count: 0, revenue: 0 };
            itemMap[item.id].count += item.qty;
            itemMap[item.id].revenue += item.subtotal;
          });
        }
      });

      const todayExpenses = expenseItems
        .filter(e => { const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt ?? 0); return d >= todayStart; })
        .reduce((s, e) => s + e.amount, 0);

      const lowStock = stockItems.filter(i => i.status === 'critical' || i.status === 'low').map(i => ({ name: i.name, stock: i.stock, unit: i.unit }));
      const chartData = Object.entries(dayMap).map(([day, v]) => ({ day, v }));
      const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      const netProfit = todaySales - todayExpenses;

      const payload: InsightsData = {
        shopName: user.shopName || user.ownerName || 'Karenderya',
        ownerName: user.ownerName || 'Tindera',
        weekSales, todaySales, todayExpenses, netProfit, orders,
        topItems, lowStock, chartData,
      };

      setSummaryData(payload);

      const fingerprint = makeFingerprint(payload);
      const lastFingerprint = await AsyncStorage.getItem(SNAPSHOT_KEY);

      if (fingerprint === lastFingerprint && history.length > 0) {
        setInsights(history[0].insights);
        setGenerated(true);
        setNoChange(true);
        return;
      }

      setNoChange(false);
      const result = await generateInsights(payload);
      setInsights(result);
      setGenerated(true);
      await AsyncStorage.setItem(SNAPSHOT_KEY, fingerprint);
      await saveToHistory(payload, result);
    } catch (e: any) {
      console.error('[Insights]', e);
      setError(e?.message ?? 'Hindi ma-generate ang insights. Subukan ulit.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, expenseItems, stockItems, history]);

  const onRefresh = () => { setRefreshing(true); fetchAndGenerate(); };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <SparklesIcon size={18} color={Colors.primary} />
          <View>
            <Text style={s.title}>AI Insights</Text>
            <Text style={s.sub}>Groq · Llama 3.3</Text>
          </View>
        </View>
        {generated && (
          <TouchableOpacity style={s.refreshBtn} onPress={fetchAndGenerate} disabled={loading}>
            <Text style={s.refreshText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Not yet generated */}
        {!generated && !loading && (
          <View style={s.hero}>
            <Text style={s.heroTitle}>Business Intelligence</Text>
            <Text style={s.heroBody}>
              I-analyze ang iyong sales, gastos, at inventory para makakuha ng personalized na business insights sa Taglish.
            </Text>
            <TouchableOpacity style={s.generateBtn} onPress={fetchAndGenerate}>
              <SparklesIcon size={18} color={Colors.white} />
              <Text style={s.generateBtnText}>Generate Insights</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.loadingTitle}>Analyzing your business data</Text>
            <Text style={s.loadingSub}>Reading sales, expenses, and inventory...</Text>
          </View>
        )}

        {/* Error */}
        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.generateBtn} onPress={fetchAndGenerate}>
              <Text style={s.generateBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current Insights */}
        {generated && !loading && insights.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>LATEST INSIGHTS</Text>
              {noChange && (
                <Text style={s.noChangeText}>Walang bagong pagbabago</Text>
              )}
            </View>
            {insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}
          </View>
        )}

        {/* Data Summary */}
        {summaryData && !loading && (
          <View style={s.summaryBox}>
            <Text style={s.summaryTitle}>DATA USED</Text>
            {([
              ['Sales today', `₱${summaryData.todaySales.toLocaleString()}`],
              ['Expenses today', `₱${summaryData.todayExpenses.toLocaleString()}`],
              ['Net profit', `₱${Math.abs(summaryData.netProfit).toLocaleString()}${summaryData.netProfit < 0 ? ' (Loss)' : ''}`],
              ['Weekly sales', `₱${summaryData.weekSales.toLocaleString()}`],
              ['Low stock items', summaryData.lowStock.length === 0 ? 'None' : `${summaryData.lowStock.length} items`],
            ] as [string, string][]).map(([k, v]) => (
              <View key={k} style={s.summaryRow}>
                <Text style={s.summaryKey}>{k}</Text>
                <Text style={s.summaryVal}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={s.section}>
            <TouchableOpacity style={s.historyToggle} onPress={() => setShowHistory(v => !v)}>
              <Text style={s.sectionLabel}>HISTORY ({history.length})</Text>
              <Text style={s.historyToggleText}>{showHistory ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
            {showHistory && history.map(item => <HistoryItem key={item.id} item={item} />)}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: FontSize.base, fontWeight: '800', color: Colors.ink },
  sub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 1 },
  refreshBtn: { backgroundColor: Colors.primarySoft, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 7 },
  refreshText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  scroll: { padding: Spacing.lg, gap: Spacing.lg },
  hero: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  heroTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink, textAlign: 'center' },
  heroBody: { fontSize: FontSize.sm, color: Colors.ink3, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.lg },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: Spacing.xl, marginTop: Spacing.md, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  generateBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
  loadingBox: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  loadingTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.ink },
  loadingSub: { fontSize: FontSize.sm, color: Colors.ink3, textAlign: 'center' },
  errorBox: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.xl },
  errorText: { fontSize: FontSize.sm, color: Colors.danger, textAlign: 'center', backgroundColor: Colors.dangerSoft, padding: Spacing.md, borderRadius: Radius.md, lineHeight: 20, width: '100%' },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.ink3, letterSpacing: 1 },
  noChangeText: { fontSize: FontSize.xs, color: Colors.ink3, fontStyle: 'italic' },
  card: { flexDirection: 'row', borderRadius: Radius.lg, backgroundColor: Colors.bgCard, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardBar: { width: 4 },
  cardContent: { flex: 1, padding: Spacing.md, gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '700', flex: 1 },
  cardBody: { fontSize: FontSize.sm, color: Colors.ink2, lineHeight: 20 },
  summaryBox: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  summaryTitle: { fontSize: 10, fontWeight: '700', color: Colors.ink3, letterSpacing: 1, marginBottom: Spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  summaryKey: { fontSize: FontSize.sm, color: Colors.ink3 },
  summaryVal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink },
  historyToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyToggleText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  historyCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  historyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  historyDate: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink },
  historySummary: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },
  historyChevron: { fontSize: 20, fontWeight: '300', color: Colors.ink3 },
  historyExpanded: { padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
});
