import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../store/useAuthStore';
import { useExpensesStore } from '../../store/useExpensesStore';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import { ArrowTrendingUpIcon, SparklesIcon, ShoppingCartIcon, Cog6ToothIcon } from '../../components/Icons';

const SCREEN_W = Dimensions.get('window').width;
type DayData = { day: string; v: number };
type TopItem = { name: string; count: number; revenue: number };
type Period = 'D' | 'W' | 'M';

// ─── Period Selector ──────────────────────────────────────────────
const PERIODS: { key: Period; label: string }[] = [
  { key: 'D', label: 'Daily' },
  { key: 'W', label: 'Weekly' },
  { key: 'M', label: 'Monthly' },
];

// ─── Sales Chart ──────────────────────────────────────────────────
const SalesChart = ({ data, period, onPeriod }: { data: DayData[]; period: Period; onPeriod: (p: Period) => void }) => {
  const W = SCREEN_W - Spacing.lg * 2 - Spacing.xl * 2;
  const H = 180;
  const padL = 36, padR = 8, padT = 12, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const total = data.reduce((s, d) => s + d.v, 0);
  const maxV = Math.max(...data.map(d => d.v), 1);
  const roundedMax = Math.ceil(maxV / 500) * 500 || 500;
  const yTicks = [0, Math.round(roundedMax / 2), roundedMax];
  const xStep = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xPos = (i: number) => padL + i * xStep;
  const yPos = (v: number) => padT + innerH - (v / roundedMax) * innerH;
  const pts = data.map((d, i) => [xPos(i), yPos(d.v)]);

  let linePath = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(i - 1, 0)];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const [x3, y3] = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = x1 + (x2 - x0) / 6, cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6, cp2y = y2 - (y3 - y1) / 6;
    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  }
  const areaPath = data.length > 1
    ? `${linePath} L ${pts[pts.length - 1][0]} ${padT + innerH} L ${pts[0][0]} ${padT + innerH} Z`
    : '';

  // Only label every nth point to avoid crowding
  const step = data.length > 15 ? Math.ceil(data.length / 8) : 1;

  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View>
          <Text style={s.cardTitle}>Sales</Text>
          <Text style={s.cardSub}>Total: ₱{total.toLocaleString()}</Text>
        </View>
        <View style={s.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p.key} style={[s.periodBtn, period === p.key && s.periodBtnActive]} onPress={() => onPeriod(p.key)}>
              <Text style={[s.periodBtnText, period === p.key && s.periodBtnTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {total === 0 ? (
        <View style={s.emptyChart}>
          <Text style={s.emptyChartText}>Wala pang benta para sa panahong ito.</Text>
        </View>
      ) : (
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={Colors.primary} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={Colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {yTicks.map(t => (
            <G key={t}>
              <Line x1={padL} x2={W - padR} y1={yPos(t)} y2={yPos(t)} stroke="#EBEAE5" strokeDasharray="3 3" />
              <SvgText x={padL - 4} y={yPos(t) + 4} textAnchor="end" fill={Colors.ink3} fontSize={9} fontFamily="System">
                {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}k` : t}
              </SvgText>
            </G>
          ))}
          {areaPath ? <Path d={areaPath} fill="url(#fill)" /> : null}
          <Path d={linePath} fill="none" stroke={Colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {pts.map(([px, py], i) => <Circle key={i} cx={px} cy={py} r={3.5} fill={Colors.primary} stroke="#fff" strokeWidth={2} />)}
          {data.map((d, i) => i % step === 0 ? (
            <SvgText key={d.day} x={xPos(i)} y={H - 6} textAnchor="middle" fill={Colors.ink3} fontSize={9} fontFamily="System">{d.day}</SvgText>
          ) : null)}
        </Svg>
      )}
    </View>
  );
};

// ─── Top Items ────────────────────────────────────────────────────
const TopItems = ({ items }: { items: TopItem[] }) => (
  <View style={s.card}>
    <View style={s.cardHead}><Text style={s.cardTitle}>Top sellers — today</Text></View>
    {items.length === 0
      ? <Text style={[s.emptyChartText, { padding: Spacing.md }]}>Wala pang benta ngayon.</Text>
      : items.map((it, i) => (
        <View key={it.name} style={s.topItem}>
          <Text style={s.topRank}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.topName}>{it.name}</Text>
            <Text style={s.topCount}>{it.count} sold</Text>
          </View>
          <Text style={s.topRevenue}>₱{it.revenue.toLocaleString()}</Text>
        </View>
      ))
    }
  </View>
);

// ─── Dashboard ────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { items: expenseItems } = useExpensesStore();

  const [period, setPeriod] = useState<Period>('W');
  const [sales, setSales] = useState(0);
  const [orders, setOrders] = useState(0);
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const buildDayLabel = (d: Date, p: Period) => {
    const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (p === 'D') {
      const h = d.getHours();
      return h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
    }
    if (p === 'M') return `${d.getMonth() + 1}/${d.getDate()}`;
    return DAY[d.getDay()];
  };

  const fetchStats = useCallback(async (p: Period) => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

      // Determine query range and bucket count
      let startDate: Date;
      let buckets: { key: string; label: string; v: number }[] = [];

      if (p === 'D') {
        // Today only, grouped by 2-hour blocks
        startDate = new Date(todayStart);
        for (let h = 0; h < 24; h += 2) {
          const d = new Date(todayStart); d.setHours(h);
          buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${h}`, label: buildDayLabel(d, 'D'), v: 0 });
        }
      } else if (p === 'W') {
        startDate = new Date(now); startDate.setDate(now.getDate() - 6); startDate.setHours(0, 0, 0, 0);
        for (let i = 0; i < 7; i++) {
          const d = new Date(now); d.setDate(now.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
          buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, label: buildDayLabel(d, 'W'), v: 0 });
        }
      } else {
        startDate = new Date(now); startDate.setDate(now.getDate() - 29); startDate.setHours(0, 0, 0, 0);
        for (let i = 0; i < 30; i++) {
          const d = new Date(now); d.setDate(now.getDate() - (29 - i)); d.setHours(0, 0, 0, 0);
          buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, label: buildDayLabel(d, 'M'), v: 0 });
        }
      }

      const snap = await getDocs(query(
        collection(db, 'orders', user.uid, 'transactions'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'asc'),
      ));

      let todaySales = 0, todayOrders = 0;
      const itemMap: Record<string, TopItem> = {};

      snap.forEach(doc => {
        const data = doc.data();
        const date = (data.createdAt as Timestamp).toDate();
        let key: string;
        if (p === 'D') {
          const bucket = Math.floor(date.getHours() / 2) * 2;
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${bucket}`;
        } else {
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        }
        const b = buckets.find(bk => bk.key === key);
        if (b) b.v += data.total;

        if (date >= todayStart) {
          todaySales += data.total; todayOrders++;
          (data.items || []).forEach((item: any) => {
            if (!itemMap[item.id]) itemMap[item.id] = { name: item.name, count: 0, revenue: 0 };
            itemMap[item.id].count += item.qty;
            itemMap[item.id].revenue += item.subtotal;
          });
        }
      });

      setSales(todaySales);
      setOrders(todayOrders);
      setChartData(buckets.map(b => ({ day: b.label, v: b.v })));
      setTopItems(Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
    } catch (e) {
      console.error('[Dashboard]', e);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { fetchStats(period); }, [period, fetchStats]);

  const onRefresh = async () => { setRefreshing(true); await fetchStats(period); setRefreshing(false); };

  // Compute today's expenses from the real-time store
  const todayStart2 = new Date(); todayStart2.setHours(0, 0, 0, 0);
  const todayExpenses = expenseItems
    .filter(e => { const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt ?? 0); return d >= todayStart2; })
    .reduce((s, e) => s + e.amount, 0);
  const netProfit = sales - todayExpenses;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const ownerName = user?.ownerName || user?.shopName || 'Tindera';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* ── Header ── */}
        <View style={s.headerBlock}>
          <View style={{ flex: 1 }}>
            <Text style={s.kumusta}>KUMUSTA, {ownerName.toUpperCase()}!</Text>
            <Text style={s.overviewTitle}>Today's overview</Text>
            <Text style={s.headerSub}>{dateStr} · {timeStr}</Text>
          </View>
          <TouchableOpacity style={s.settingsBtn} onPress={() => router.push('/settings')}>
            <Cog6ToothIcon size={20} color={Colors.ink2} />
          </TouchableOpacity>
        </View>

        {/* ── POS Launch ── */}
        <TouchableOpacity style={s.posBtn} onPress={() => router.push('/pos')} activeOpacity={0.85}>
          <ShoppingCartIcon size={20} color={Colors.white} />
          <Text style={s.posBtnText}>Open Store View</Text>
        </TouchableOpacity>

        {/* ── KPI Tiles ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.kpiRow}>
          <View style={s.kpiTile}>
            <Text style={s.kpiLabel}>TODAY · SALES</Text>
            <Text style={s.kpiValue}>₱{sales.toLocaleString()}</Text>
            {sales > 0 && <View style={s.kpiDelta}><ArrowTrendingUpIcon size={12} color={Colors.success} /><Text style={[s.kpiDeltaText, { color: Colors.success }]}> {orders} orders</Text></View>}
          </View>
          <View style={s.kpiTile}>
            <Text style={s.kpiLabel}>TODAY · EXPENSES</Text>
            <Text style={[s.kpiValue, { color: Colors.danger }]}>₱{todayExpenses.toLocaleString()}</Text>
            {todayExpenses === 0 && <Text style={s.kpiSub}>No expenses logged</Text>}
          </View>
          <View style={s.kpiTile}>
            <Text style={s.kpiLabel}>NET PROFIT</Text>
            <Text style={[s.kpiValue, { color: netProfit >= 0 ? Colors.success : Colors.danger }]}>
              ₱{Math.abs(netProfit).toLocaleString()}
            </Text>
            <Text style={s.kpiSub}>{netProfit < 0 ? '⚠ Loss' : 'Sales − Expenses'}</Text>
          </View>
          <View style={s.kpiTile}>
            <Text style={s.kpiLabel}>TODAY · ORDERS</Text>
            <Text style={s.kpiValue}>{orders}</Text>
          </View>
        </ScrollView>

        {/* ── Chart ── */}
        {!loading && <SalesChart data={chartData} period={period} onPeriod={p => { setPeriod(p); }} />}

        {/* ── Top Items ── */}
        <TopItems items={topItems} />

        {/* ── AI Insights card ── */}
        <TouchableOpacity style={s.insightsCard} onPress={() => router.push('/(tabs)/insights')} activeOpacity={0.88}>
          <View style={s.insightsHead}>
            <View style={s.insightsIconCircle}>
              <SparklesIcon size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.insightsTitle}>AI Insights</Text>
              <Text style={s.insightsSub}>Powered by Groq · Llama 3.3</Text>
            </View>
          </View>
          <Text style={s.insightsBody}>
            {orders === 0
              ? 'Kumuha ng personalized na business advice base sa iyong sales, gastos, at inventory.'
              : `May ${orders} na orders ka ngayon. I-analyze para makita kung kumikita ka.`}
          </Text>
          <View style={s.insightsCTABtn}>
            <SparklesIcon size={15} color={Colors.white} />
            <Text style={s.insightsCTABtnText}>I-generate ang Insights</Text>
          </View>
        </TouchableOpacity>

        {/* Bottom padding for floating tab bar */}
        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.md },

  // Header
  headerBlock: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  settingsBtn: { marginTop: 4, width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  overviewTitle: { fontSize: 28, fontWeight: '900', color: Colors.ink, letterSpacing: -0.5, lineHeight: 32 },
  headerSub: { fontSize: FontSize.xs, color: Colors.ink3, fontWeight: '500', marginTop: 3 },
  kumusta: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5, marginBottom: 2 },
  dateText: { fontSize: FontSize.xs, color: Colors.ink3, fontWeight: '500' },
  timeText: { fontSize: FontSize.xs, color: Colors.ink3, fontWeight: '500', marginTop: 1 },

  // POS button
  posBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  posBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  // KPI
  kpiRow: { gap: Spacing.sm, paddingBottom: 4 },
  kpiTile: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, minWidth: 148, borderWidth: 1, borderColor: Colors.border },
  kpiLabel: { fontSize: 10, color: Colors.ink3, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5 },
  kpiDelta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  kpiDeltaText: { fontSize: 11, fontWeight: '600' },
  kpiSub: { fontSize: 10, color: Colors.ink3, marginTop: 3 },

  // Card
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.ink },
  cardSub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },

  // Period selector
  periodRow: { flexDirection: 'row', gap: 4 },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.bgInput },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodBtnText: { fontSize: 11, fontWeight: '600', color: Colors.ink3 },
  periodBtnTextActive: { color: Colors.white },

  // Empty chart
  emptyChart: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyChartText: { fontSize: FontSize.sm, color: Colors.ink3, textAlign: 'center' },

  // Top items
  topItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  topRank: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.ink3, width: 20 },
  topName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink },
  topCount: { fontSize: FontSize.xs, color: Colors.ink3 },
  topRevenue: { fontSize: FontSize.base, fontWeight: '700', color: Colors.ink },

  // AI Insights card
  insightsCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.lg, gap: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  insightsHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  insightsIconCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  insightsTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.ink },
  insightsSub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 1 },
  insightsBody: { fontSize: FontSize.sm, color: Colors.ink2, lineHeight: 20 },
  insightsCTABtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: 12,
  },
  insightsCTABtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
});
