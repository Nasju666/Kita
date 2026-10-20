import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Timestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/useAuthStore';
import { useExpensesStore, Expense } from '../../store/useExpensesStore';
import { extractReceiptOCR } from '../../services/gemini';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import { PlusIcon, TrashIcon, CameraIcon, DocumentTextIcon } from '../../components/Icons';

// ─── Add Expense Modal ────────────────────────────────────────────
function AddModal({ visible, onClose, uid }: { visible: boolean; onClose: () => void; uid: string }) {
  const { addExpense } = useExpensesStore();

  // Single-item form
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState('');
  const [note, setNote] = useState('');

  // Bulk mode (OCR result)
  const [scannedItems, setScannedItems] = useState<Array<{ name: string; amount: string; cat: string; note: string }>>([]);
  const isBulk = scannedItems.length > 0;

  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  const reset = () => {
    setName(''); setAmount(''); setCat(''); setNote('');
    setScannedItems([]); setErr('');
  };

  // ── OCR ──────────────────────────────────────────────────────────
  const scanReceipt = async (mode: 'camera' | 'upload') => {
    setScanning(true); setErr('');
    try {
      let result: ImagePicker.ImagePickerResult;
      if (mode === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { setErr('Kailangan ng camera permission.'); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: true });
      }
      if (!result.canceled && result.assets[0]?.base64) {
        const items = await extractReceiptOCR(result.assets[0].base64);
        if (items.length === 0) {
          setErr('Walang nakitang items. Subukan ulit o mag-type ng manual.');
          return;
        }
        if (items.length === 1) {
          // Single item — fill the manual form instead
          setName(items[0].name); setAmount(String(items[0].amount));
          setCat(items[0].category); setNote(items[0].note);
        } else {
          // Multiple items — switch to bulk review mode
          setScannedItems(items.map(i => ({ name: i.name, amount: String(i.amount), cat: i.category, note: i.note })));
        }
      }
    } catch (e: any) {
      setErr('OCR failed: ' + (e?.message ?? 'Unknown error'));
    } finally { setScanning(false); }
  };

  // ── Update a scanned item field ───────────────────────────────────
  const updateItem = (i: number, field: string, val: string) => {
    setScannedItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };
  const removeItem = (i: number) => setScannedItems(prev => prev.filter((_, idx) => idx !== i));
  const addBlankItem = () => setScannedItems(prev => [...prev, { name: '', amount: '', cat: '', note: '' }]);

  // ── Save single ───────────────────────────────────────────────────
  const saveSingle = async () => {
    if (!name.trim()) return setErr('Pangalan ay kinakailangan.');
    if (!amount || isNaN(+amount) || +amount <= 0) return setErr('Ilagay ang tamang halaga.');
    if (!cat.trim()) return setErr('Category ay kinakailangan.');
    setSaving(true);
    try {
      await addExpense(uid, { name: name.trim(), amount: parseFloat(amount), cat: cat.trim(), note: note.trim() });
      reset(); onClose();
    } catch (e: any) { setErr(e?.message ?? 'May error.'); }
    setSaving(false);
  };

  // ── Save all bulk items ────────────────────────────────────────────
  const saveAll = async () => {
    const invalid = scannedItems.find(i => !i.name.trim() || !i.amount || isNaN(+i.amount) || +i.amount <= 0);
    if (invalid) return setErr('May item na walang pangalan o halaga. Baguhin bago i-save.');
    setSaving(true);
    try {
      for (const item of scannedItems) {
        await addExpense(uid, { name: item.name.trim(), amount: parseFloat(item.amount), cat: item.cat.trim() || 'Other', note: item.note.trim() });
      }
      reset(); onClose();
    } catch (e: any) { setErr(e?.message ?? 'May error.'); }
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={m.overlay}>
        <View style={m.sheet}>

          {/* ── Title ── */}
          <View style={m.titleRow}>
            <Text style={m.title}>{isBulk ? `${scannedItems.length} Items` : 'Bagong Gastos'}</Text>
            <View style={m.modeToggle}>
              <TouchableOpacity
                style={[m.modeBtn, !isBulk && m.modeBtnActive]}
                onPress={() => setScannedItems([])}
              >
                <Text style={[m.modeBtnText, !isBulk && m.modeBtnTextActive]}>Single</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.modeBtn, isBulk && m.modeBtnActive]}
                onPress={() => { if (!isBulk) setScannedItems([{ name: '', amount: '', cat: '', note: '' }]); }}
              >
                <Text style={[m.modeBtnText, isBulk && m.modeBtnTextActive]}>Multiple</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── OCR buttons — always visible ── */}
          <View style={m.ocrRow}>
            <TouchableOpacity style={[m.ocrBtn, scanning && { opacity: 0.5 }]} onPress={() => scanReceipt('camera')} disabled={scanning}>
              {scanning ? <ActivityIndicator size="small" color={Colors.primary} /> : <CameraIcon size={15} color={Colors.primary} />}
              <Text style={m.ocrBtnText}>Scan Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[m.ocrBtn, scanning && { opacity: 0.5 }]} onPress={() => scanReceipt('upload')} disabled={scanning}>
              <DocumentTextIcon size={15} color={Colors.primary} />
              <Text style={m.ocrBtnText}>Upload Photo</Text>
            </TouchableOpacity>
          </View>

          {/* ── BULK REVIEW MODE ─────────────────────────────────── */}
          {isBulk && (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {scannedItems.map((item, i) => (
                <View key={i} style={m.bulkItem}>
                  <View style={m.bulkItemHeader}>
                    <Text style={m.bulkItemNum}>Item {i + 1}</Text>
                    <TouchableOpacity onPress={() => removeItem(i)}>
                      <TrashIcon size={15} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                  <TextInput style={m.input} value={item.name}
                    onChangeText={v => updateItem(i, 'name', v)}
                    placeholder="Pangalan ng item" placeholderTextColor={Colors.ink3} />
                  <View style={m.ocrRow}>
                    <TextInput style={[m.input, { flex: 1 }]} value={item.amount}
                      onChangeText={v => updateItem(i, 'amount', v)}
                      keyboardType="numeric" placeholder="Halaga (₱)" placeholderTextColor={Colors.ink3} />
                    <TextInput style={[m.input, { flex: 1 }]} value={item.cat}
                      onChangeText={v => updateItem(i, 'cat', v)}
                      placeholder="Category" placeholderTextColor={Colors.ink3} />
                  </View>
                </View>
              ))}
              <TouchableOpacity style={m.addItemBtn} onPress={addBlankItem}>
                <Text style={m.addItemBtnText}>+ Add another item</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── SINGLE FORM MODE ─────────────────────────────────── */}
          {!isBulk && (
            <>
              <Text style={m.label}>Pangalan ng Gastos</Text>
              <TextInput style={m.input} value={name} onChangeText={v => { setName(v); setErr(''); }}
                placeholder="e.g. Kuryente, Tubig, Sangkap…" placeholderTextColor={Colors.ink3} />
              <View style={m.ocrRow}>
                <View style={{ flex: 1 }}>
                  <Text style={m.label}>Halaga (₱)</Text>
                  <TextInput style={m.input} value={amount} onChangeText={v => { setAmount(v); setErr(''); }}
                    keyboardType="numeric" placeholder="0.00" placeholderTextColor={Colors.ink3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={m.label}>Category</Text>
                  <TextInput style={m.input} value={cat} onChangeText={v => { setCat(v); setErr(''); }}
                    placeholder="e.g. Ingredients…" placeholderTextColor={Colors.ink3} />
                </View>
              </View>
              <Text style={m.label}>Note (optional)</Text>
              <TextInput style={m.input} value={note} onChangeText={setNote}
                placeholder="Dagdag na detalye…" placeholderTextColor={Colors.ink3} />
            </>
          )}

          {!!err && <Text style={m.err}>{err}</Text>}

          {/* ── Footer ── */}
          <View style={m.footer}>
            <TouchableOpacity style={m.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={m.cancelText}>{isBulk ? 'Kanselahin' : 'Kanselahin'}</Text>
            </TouchableOpacity>
            {isBulk ? (
              <TouchableOpacity style={[m.saveBtn, saving && { opacity: 0.5 }]} onPress={saveAll} disabled={saving}>
                <Text style={m.saveBtnText}>{saving ? 'Sine-save…' : `I-save Lahat (${scannedItems.length})`}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[m.saveBtn, saving && { opacity: 0.5 }]} onPress={saveSingle} disabled={saving}>
                <Text style={m.saveBtnText}>I-save ang Gastos</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
const toDate = (ts: any): Date => {
  if (!ts) return new Date(0);
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
};
const isToday = (d: Date) => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return d >= now;
};
const fmtDate = (ts: any) => toDate(ts).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// ─── Expenses Screen ──────────────────────────────────────────────
export default function ExpensesScreen() {
  const { user } = useAuthStore();
  const { items, loading, deleteExpense } = useExpensesStore();
  const [showAdd, setShowAdd] = useState(false);

  if (!user) return null;

  const todayTotal = useMemo(() =>
    items.filter(e => isToday(toDate(e.createdAt))).reduce((s, e) => s + e.amount, 0),
    [items]);

  const todayItems = items.filter(e => isToday(toDate(e.createdAt)));
  const olderItems = items.filter(e => !isToday(toDate(e.createdAt)));

  const confirmDelete = (expense: Expense) => {
    Alert.alert('Tanggalin?', `Burahin ang "${expense.name}"?`, [
      { text: 'Hindi', style: 'cancel' },
      { text: 'Oo, Burahin', style: 'destructive', onPress: () => deleteExpense(user.uid, expense.id) },
    ]);
  };

  const ExpenseRow = ({ expense }: { expense: Expense }) => (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowName}>{expense.name}</Text>
        <Text style={s.rowMeta}>{expense.cat} · {fmtDate(expense.createdAt)}</Text>
        {!!expense.note && <Text style={s.rowNote}>{expense.note}</Text>}
      </View>
      <Text style={s.rowAmount}>₱{expense.amount.toLocaleString()}</Text>
      <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(expense)}>
        <TrashIcon size={15} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Gastos</Text>
          <Text style={s.sub}>Today: ₱{todayTotal.toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <PlusIcon size={18} color={Colors.white} />
          <Text style={s.addBtnText}>Add Expense</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {loading && <Text style={s.loadingText}>Loading gastos…</Text>}

        {!loading && items.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Walang gastos pa.</Text>
            <Text style={s.emptySub}>I-tap ang "Add Expense" para magsimula.</Text>
          </View>
        )}

        {todayItems.length > 0 && (
          <View>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>NGAYON</Text>
              <Text style={s.sectionTotal}>₱{todayItems.reduce((s, e) => s + e.amount, 0).toLocaleString()}</Text>
            </View>
            {todayItems.map(e => <ExpenseRow key={e.id} expense={e} />)}
          </View>
        )}

        {olderItems.length > 0 && (
          <View>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>NAKARAAN</Text>
              <Text style={s.sectionTotal}>₱{olderItems.reduce((s, e) => s + e.amount, 0).toLocaleString()}</Text>
            </View>
            {olderItems.map(e => <ExpenseRow key={e.id} expense={e} />)}
          </View>
        )}
      </ScrollView>

      <AddModal visible={showAdd} onClose={() => setShowAdd(false)} uid={user.uid} />
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
  empty: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.ink2 },
  emptySub: { fontSize: FontSize.sm, color: Colors.ink3, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.ink3, letterSpacing: 1 },
  sectionTotal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink2 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  rowName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.ink },
  rowMeta: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },
  rowNote: { fontSize: FontSize.xs, color: Colors.ink3, fontStyle: 'italic', marginTop: 2 },
  rowAmount: { fontSize: FontSize.base, fontWeight: '800', color: Colors.danger },
  deleteBtn: { height: 36, width: 36, backgroundColor: Colors.dangerSoft, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink2, marginBottom: 4 },
  input: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.base, color: Colors.ink, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', gap: Spacing.md },
  err: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.bgInput, alignItems: 'center' },
  cancelText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.ink2 },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
  ocrRow: { flexDirection: 'row', gap: Spacing.sm },
  ocrBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primarySoft, borderRadius: Radius.md, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  ocrBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  bulkItem: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  bulkItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bulkItemNum: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink3, letterSpacing: 0.5 },
  addItemBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
  addItemBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeToggle: { flexDirection: 'row', backgroundColor: Colors.bgInput, borderRadius: Radius.full, padding: 3, gap: 2 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink3 },
  modeBtnTextActive: { color: Colors.white },
});
