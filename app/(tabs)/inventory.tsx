import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { useInventoryStore, StockItem } from '../../store/useInventoryStore';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import { PlusIcon, TrashIcon } from '../../components/Icons';

const UNITS = ['kg', 'L', 'pcs', 'g', 'mL', 'pack'];
const PRESETS = [1, 5, 10, 25];

const statusColor = (s: StockItem['status']) =>
  s === 'critical' ? Colors.danger : s === 'low' ? Colors.warning : Colors.success;
const statusBg = (s: StockItem['status']) =>
  s === 'critical' ? Colors.dangerSoft : s === 'low' ? Colors.warningSoft : Colors.successSoft;

// ─── Add Stock Modal ──────────────────────────────────────────────
function AddModal({ visible, onClose, uid }: { visible: boolean; onClose: () => void; uid: string }) {
  const { addItem } = useInventoryStore();
  const [name, setName] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('kg');
  const [usage, setUsage] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setStock(''); setUnit('kg'); setUsage(''); setErr(''); };

  const save = async () => {
    if (!name.trim()) return setErr('Pangalan ay kinakailangan.');
    if (!stock || isNaN(+stock) || +stock < 0) return setErr('Ilagay ang tamang stock quantity.');
    if (!usage || isNaN(+usage) || +usage <= 0) return setErr('Ilagay ang average daily usage.');
    setSaving(true);
    try {
      await addItem(uid, { name: name.trim(), stock: parseFloat(stock), unit, usage: parseFloat(usage) });
      reset(); onClose();
    } catch { setErr('May error. Subukan muli.'); }
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.title}>➕ Magdagdag ng Sangkap</Text>

          <Text style={m.label}>Pangalan ng Sangkap</Text>
          <TextInput style={m.input} value={name} onChangeText={v => { setName(v); setErr(''); }}
            placeholder="e.g. Kamatis, Gata…" placeholderTextColor={Colors.ink3} />

          <View style={m.row}>
            <View style={{ flex: 1 }}>
              <Text style={m.label}>Kasalukuyang Stock</Text>
              <TextInput style={m.input} value={stock} onChangeText={v => { setStock(v); setErr(''); }}
                keyboardType="numeric" placeholder="0.0" placeholderTextColor={Colors.ink3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={m.label}>Avg Daily Usage</Text>
              <TextInput style={m.input} value={usage} onChangeText={v => { setUsage(v); setErr(''); }}
                keyboardType="numeric" placeholder="0.0" placeholderTextColor={Colors.ink3} />
            </View>
          </View>

          <Text style={m.label}>Unit</Text>
          <View style={m.pillRow}>
            {UNITS.map(u => (
              <TouchableOpacity key={u} style={[m.pill, unit === u && m.pillActive]} onPress={() => setUnit(u)}>
                <Text style={[m.pillText, unit === u && m.pillTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!err && <Text style={m.err}>{err}</Text>}
          <View style={m.footer}>
            <TouchableOpacity style={m.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={m.cancelText}>Kanselahin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[m.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
              <Text style={m.saveBtnText}>I-save ang Sangkap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Restock Modal ────────────────────────────────────────────────
function RestockModal({ item, onClose, uid }: { item: StockItem | null; onClose: () => void; uid: string }) {
  const { restockItem } = useInventoryStore();
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { setAmount(''); setErr(''); }, [item]);

  if (!item) return null;

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) return setErr('Ilagay ang tamang halaga.');
    setSaving(true);
    try {
      await restockItem(uid, item.id, amt, item.stock, item.usage);
      onClose();
    } catch { setErr('May error. Subukan muli.'); }
    setSaving(false);
  };

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={m.overlay}>
        <View style={m.sheet}>
          <Text style={m.title}>Restock: {item.name}</Text>
          <View style={m.currentStock}>
            <Text style={m.label}>Kasalukuyang stock</Text>
            <Text style={m.currentStockVal}>{item.stock} {item.unit}</Text>
          </View>

          <Text style={m.label}>Idagdag ({item.unit})</Text>
          <TextInput style={m.input} value={amount} onChangeText={v => { setAmount(v); setErr(''); }}
            keyboardType="numeric" placeholder="0.0" placeholderTextColor={Colors.ink3} />

          <View style={m.pillRow}>
            {PRESETS.map(p => (
              <TouchableOpacity key={p} style={[m.pill, amount === String(p) && m.pillActive]} onPress={() => { setAmount(String(p)); setErr(''); }}>
                <Text style={[m.pillText, amount === String(p) && m.pillTextActive]}>+{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!err && <Text style={m.err}>{err}</Text>}
          <View style={m.footer}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}><Text style={m.cancelText}>Kanselahin</Text></TouchableOpacity>
            <TouchableOpacity style={[m.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
              <Text style={m.saveBtnText}>I-update ang Stock</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Inventory Screen ─────────────────────────────────────────────
export default function InventoryScreen() {
  const { user } = useAuthStore();
  const { items, loading, deleteItem } = useInventoryStore();
  const [showAdd, setShowAdd] = useState(false);
  const [restockItem, setRestockItem] = useState<StockItem | null>(null);

  if (!user) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Inventory</Text>
          <Text style={s.sub}>Subaybayan ang mga sangkap.</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <PlusIcon size={18} color={Colors.white} />
          <Text style={s.addBtnText}>Add Stock</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading && <Text style={s.loadingText}>Loading inventory…</Text>}
        {!loading && items.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>Walang sangkap pa.</Text>
            <Text style={s.emptySub}>Pindutin ang "Add Stock" para magsimula.</Text>
          </View>
        )}
        {items.map(item => {
          const days = item.usage > 0 ? Math.floor(item.stock / item.usage) : 999;
          return (
            <View key={item.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemMeta}>{item.stock} {item.unit} · usage: {item.usage}/{item.unit}/day</Text>
              </View>
              <View style={[s.badge, { backgroundColor: statusBg(item.status) }]}>
                <Text style={[s.badgeText, { color: statusColor(item.status) }]}>
                  {days >= 999 ? '∞' : `${days}d left`}
                </Text>
              </View>
              <TouchableOpacity style={s.restockBtn} onPress={() => setRestockItem(item)}>
                <Text style={s.restockText}>Restock</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => Alert.alert(
                  'Tanggalin?', `Burahin ang ${item.name}?`,
                  [{ text: 'Hindi', style: 'cancel' },
                   { text: 'Oo, Burahin', style: 'destructive', onPress: () => deleteItem(user.uid, item.id) }]
                )}
              >
                <TrashIcon size={16} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <AddModal visible={showAdd} onClose={() => setShowAdd(false)} uid={user.uid} />
      <RestockModal item={restockItem} onClose={() => setRestockItem(null)} uid={user.uid} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink },
  sub: { fontSize: FontSize.xs, color: Colors.ink3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  addBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
  loadingText: { textAlign: 'center', color: Colors.ink3, padding: Spacing.xl },
  emptyState: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.ink2 },
  emptySub: { fontSize: FontSize.sm, color: Colors.ink3, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  itemName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.ink },
  itemMeta: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },
  badge: { height: 36, borderRadius: Radius.sm, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  restockBtn: { height: 36, backgroundColor: Colors.bgInput, borderRadius: Radius.sm, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  restockText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink2 },
  deleteBtn: { height: 36, width: 36, backgroundColor: Colors.dangerSoft, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink2, marginBottom: 4 },
  input: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.base, color: Colors.ink, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', gap: Spacing.md },
  pillRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  pill: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.bgInput, borderWidth: 1.5, borderColor: 'transparent' },
  pillActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  pillText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink2 },
  pillTextActive: { color: Colors.primary },
  err: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600' },
  currentStock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.md },
  currentStockVal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink },
  footer: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.bgInput, alignItems: 'center' },
  cancelText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.ink2 },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
