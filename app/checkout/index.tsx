import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../store/useAuthStore';
import { usePOSStore } from '../../store/usePOSStore';
import { useMenuStore } from '../../store/useMenuStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import { ArrowLeftIcon, CheckIcon } from '../../components/Icons';

const { width: W } = Dimensions.get('window');
const KEY_W = (W - Spacing.lg * 2 - Spacing.sm * 2) / 3;

// ─── Numpad ───────────────────────────────────────────────────────
const KEYS = ['1','2','3','4','5','6','7','8','9','C','0','⌫'];

const Numpad = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const press = (k: string) => {
    if (k === 'C')  return onChange('');
    if (k === '⌫') return onChange(value.slice(0, -1));
    onChange((value + k).slice(0, 7));
  };
  return (
    <View style={styles.numpad}>
      {KEYS.map(k => (
        <TouchableOpacity
          key={k}
          style={[styles.numkey, (k === 'C' || k === '⌫') && styles.numkeyUtil]}
          onPress={() => press(k)}
          activeOpacity={0.65}
        >
          <Text style={[styles.numkeyText, (k === 'C' || k === '⌫') && styles.numkeyUtilText]}>{k}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Quick Amounts ────────────────────────────────────────────────
const QuickAmounts = ({ total, onPick }: { total: number; onPick: (v: number) => void }) => {
  const presets = [
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 100) * 100 + 100,
    500, 1000,
  ].filter((v, i, a) => v >= total && a.indexOf(v) === i).slice(0, 4);

  return (
    <View style={styles.quickRow}>
      {presets.map(p => (
        <TouchableOpacity key={p} style={styles.quickBtn} onPress={() => onPick(p)} activeOpacity={0.7}>
          <Text style={styles.quickBtnText}>₱{p.toLocaleString()}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Success Modal ────────────────────────────────────────────────
const SuccessModal = ({ change, onDone, t }: { change: number; onDone: () => void; t: any }) => (
  <View style={styles.overlay}>
    <View style={styles.successCard}>
      <View style={styles.successIcon}>
        <CheckIcon size={40} color={Colors.white} />
      </View>
      <Text style={styles.successTitle}>{t.paidSuccess} 🎉</Text>
      <Text style={styles.successSub}>{t.orderRecorded}</Text>
      {change > 0 && (
        <View style={styles.sukliBox}>
          <Text style={styles.sukliLabel}>Sukli</Text>
          <Text style={styles.sukliAmt}>₱{change.toLocaleString()}.00</Text>
        </View>
      )}
      <TouchableOpacity style={styles.newOrderBtn} onPress={onDone} activeOpacity={0.85}>
        <Text style={styles.newOrderBtnText}>{t.newOrder}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Checkout Screen ──────────────────────────────────────────────
export default function CheckoutScreen() {
  const { user, isInitializing } = useAuthStore();
  const router = useRouter();
  const { items: menu } = useMenuStore();
  const { items: inventoryItems, deductStock } = useInventoryStore();
  const { t } = useLanguageStore();
  const { cart, clearCart, incrementOrder, orderNum, getCartLines, getTotal } = usePOSStore();

  const [received, setReceived] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [changeAmt, setChangeAmt] = useState(0);

  if (isInitializing) return null;
  if (!user) return <Redirect href="/login" />;

  const cartLines = getCartLines(menu);
  const total = getTotal(menu);
  const recv = parseInt(received || '0', 10);
  const change = recv - total;
  const enough = recv >= total;

  const handleConfirm = async () => {
    if (!enough || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'orders', user.uid, 'transactions'), {
        orderNum,
        items: cartLines.map(({ menuItem, qty }) => ({
          id: menuItem.id, name: menuItem.name, price: menuItem.price,
          qty, subtotal: menuItem.price * qty,
        })),
        total, received: recv, change,
        createdAt: serverTimestamp(),
      });
      // Deduct sold quantities from inventory
      for (const { menuItem, qty } of cartLines) {
        if (menuItem.inventoryItemId) {
          const inv = inventoryItems.find(i => i.id === menuItem.inventoryItemId);
          if (inv) await deductStock(user.uid, inv.id, qty, inv.stock, inv.usage);
        }
      }
      setChangeAmt(change);
      setDone(true);
    } catch (e) {
      console.error('[Checkout] Failed to save order:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleNewOrder = () => {
    clearCart();
    incrementOrder();
    router.replace('/pos');
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── TOP: fixed area ── */}
      <View style={styles.top}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeftIcon size={22} color={Colors.ink2} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{t.howMuchPaid}</Text>
            <Text style={styles.headerSub}>Order #{orderNum} · {cartLines.length} item{cartLines.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Order summary — compact horizontal scroll */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.summaryScroll}
          contentContainerStyle={styles.summaryContent}
        >
          {cartLines.map(({ menuItem, qty }) => (
            <View key={menuItem.id} style={styles.summaryChip}>
              <Text style={styles.summaryChipQty}>{qty}×</Text>
              <Text style={styles.summaryChipName} numberOfLines={1}>{menuItem.name}</Text>
              <Text style={styles.summaryChipPrice}>₱{(qty * menuItem.price).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.summaryTotalChip}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalAmt}>₱{total.toLocaleString()}</Text>
          </View>
        </ScrollView>

        {/* Cash display + change */}
        <View style={styles.cashRow}>
          <View style={styles.cashDisplay}>
            <Text style={styles.cashLabel}>{t.cashReceived}</Text>
            <Text style={[styles.cashAmt, !received && styles.cashAmtPlaceholder]}>
              {received ? `₱${recv.toLocaleString()}` : '₱0'}
            </Text>
          </View>
          <View style={[styles.sukliDisplay, { backgroundColor: enough ? Colors.successSoft : Colors.warningSoft }]}>
            <Text style={styles.sukliLabel}>{t.change}</Text>
            <Text style={[styles.sukliAmt, { color: enough ? Colors.success : Colors.warning }]}>
              {enough ? `₱${change.toLocaleString()}` : `-₱${(-change).toLocaleString()}`}
            </Text>
          </View>
        </View>

        {/* Quick amounts */}
        <QuickAmounts total={total} onPick={(v) => setReceived(String(v))} />
      </View>

      {/* ── BOTTOM: numpad + confirm always visible ── */}
      <View style={styles.bottom}>
        <Numpad value={received} onChange={setReceived} />
        <TouchableOpacity
          style={[styles.confirmBtn, (!enough || saving) && styles.confirmBtnOff]}
          onPress={handleConfirm}
          disabled={!enough || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.confirmBtnText}>{t.confirmPayment}</Text>
          }
        </TouchableOpacity>
      </View>

      {done && <SuccessModal change={changeAmt} onDone={handleNewOrder} t={t} />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Layout sections
  top: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm },
  bottom: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, justifyContent: 'flex-end', gap: Spacing.sm },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.sm },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink },
  headerSub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },

  // Summary horizontal chips
  summaryScroll: { marginHorizontal: -Spacing.lg },
  summaryContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: 4 },
  summaryChip: { backgroundColor: Colors.bgCard, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  summaryChipQty: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink3 },
  summaryChipName: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.ink, maxWidth: 100 },
  summaryChipPrice: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  summaryTotalChip: { backgroundColor: Colors.ink, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  summaryTotalLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  summaryTotalAmt: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.white },

  // Cash row
  cashRow: { flexDirection: 'row', gap: Spacing.sm },
  cashDisplay: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cashLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.ink3 },
  cashAmt: { fontSize: 32, fontWeight: '800', color: Colors.ink, letterSpacing: -1 },
  cashAmtPlaceholder: { color: Colors.ink3 },
  sukliDisplay: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  sukliLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.ink3 },
  sukliAmt: { fontSize: 24, fontWeight: '800', letterSpacing: -1 },

  // Quick amounts
  quickRow: { flexDirection: 'row', gap: Spacing.sm },
  quickBtn: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  quickBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },

  // Numpad
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  numkey: { width: KEY_W, paddingVertical: 16, backgroundColor: Colors.bgCard, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  numkeyUtil: { backgroundColor: Colors.bgInput },
  numkeyText: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.ink },
  numkeyUtilText: { color: Colors.ink2, fontSize: FontSize.base },

  // Confirm
  confirmBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  confirmBtnOff: { opacity: 0.4, shadowOpacity: 0 },
  confirmBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  // Success
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', width: '100%', gap: Spacing.md },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink },
  successSub: { fontSize: FontSize.sm, color: Colors.ink3 },
  sukliBox: { backgroundColor: Colors.successSoft, borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, alignItems: 'center', width: '100%' },
  newOrderBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, paddingHorizontal: Spacing.xxl, width: '100%', alignItems: 'center' },
  newOrderBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
