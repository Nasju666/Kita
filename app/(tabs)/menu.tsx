import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthStore } from '../../store/useAuthStore';
import { useMenuStore, MenuItem } from '../../store/useMenuStore';
import { useInventoryStore, StockItem } from '../../store/useInventoryStore';
import { storage } from '../../firebase/config';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import { PlusIcon, TrashIcon, PencilSquareIcon, CameraIcon, XMarkIcon, TagIcon } from '../../components/Icons';

async function uploadImage(uid: string, uri: string): Promise<string> {
  // XMLHttpRequest blob is required in React Native / Hermes
  const blob: Blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload  = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Failed to read image file'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
  const storageRef = ref(storage, `menu/${uid}/${Date.now()}.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

// ─── Categories Modal ─────────────────────────────────────────────
function CategoriesModal({ visible, onClose, uid }: {
  visible: boolean; onClose: () => void; uid: string;
}) {
  const { categories, addCategory, removeCategory } = useMenuStore();
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const name = input.trim();
    if (!name) return;
    setSaving(true);
    await addCategory(uid, name);
    setInput('');
    setSaving(false);
  };

  const remove = (name: string) => {
    Alert.alert('Delete Category?', `"${name}" will be removed from the category list.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeCategory(uid, name) },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={cm.overlay}>
        <View style={cm.sheet}>
          <View style={cm.header}>
            <Text style={cm.title}>Manage Categories</Text>
            <TouchableOpacity onPress={onClose} style={cm.closeBtn}>
              <XMarkIcon size={20} color={Colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            {categories.length === 0
              ? <Text style={cm.empty}>Walang categories pa. Mag-add na!</Text>
              : categories.map(cat => (
                <View key={cat} style={cm.catRow}>
                  <View style={cm.catIcon}><TagIcon size={14} color={Colors.primary} /></View>
                  <Text style={cm.catName}>{cat}</Text>
                  <TouchableOpacity style={cm.catDel} onPress={() => remove(cat)}>
                    <TrashIcon size={16} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            }
          </ScrollView>

          {/* Add new */}
          <View style={cm.addRow}>
            <TextInput
              style={cm.addInput}
              value={input}
              onChangeText={setInput}
              placeholder="Bagong category name…"
              placeholderTextColor={Colors.ink3}
              onSubmitEditing={add}
              returnKeyType="done"
            />
            <TouchableOpacity style={[cm.addBtn, !input.trim() && { opacity: 0.4 }]} onPress={add} disabled={!input.trim() || saving}>
              {saving ? <ActivityIndicator size="small" color={Colors.white} /> : <PlusIcon size={18} color={Colors.white} />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Item Modal ───────────────────────────────────────────────────
function ItemModal({ visible, editItem, inventoryItems, onClose, uid }: {
  visible: boolean;
  editItem: MenuItem | null;
  inventoryItems: StockItem[];
  onClose: () => void;
  uid: string;
}) {
  const { addItem, updateItem, deleteItem, categories } = useMenuStore();

  const [name, setName]             = useState('');
  const [cat, setCat]               = useState('');
  const [price, setPrice]           = useState('');
  const [stock, setStock]           = useState('');
  const [inventoryItemId, setInventoryItemId] = useState<string | undefined>();
  const [imageUri, setImageUri]     = useState<string | null>(null);
  const [err, setErr]               = useState('');
  const [saving, setSaving]         = useState(false);

  React.useEffect(() => {
    setName(editItem?.name ?? '');
    setCat(editItem?.cat ?? '');
    setPrice(editItem ? String(editItem.price) : '');
    setStock(editItem ? String(editItem.stock) : '');
    setInventoryItemId(editItem?.inventoryItemId);
    setImageUri(editItem?.imageUrl ?? null);
    setErr('');
  }, [editItem, visible]);

  const pickImage = async (source: 'camera' | 'gallery') => {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) return setErr('Piliin o i-type ang pangalan ng item.');
    if (!cat.trim())  return setErr('Piliin ang isang category.');
    if (!price || isNaN(+price) || +price <= 0) return setErr('Ilagay ang tamang presyo.');
    if (stock === '' || isNaN(+stock) || +stock < 0) return setErr('Ilagay ang tamang stock.');
    setSaving(true);
    try {
      let finalImageUrl = editItem?.imageUrl;
      if (imageUri && imageUri !== editItem?.imageUrl)
        finalImageUrl = await uploadImage(uid, imageUri);
      if (!imageUri) finalImageUrl = undefined;
      const data: any = {
        name: name.trim(), cat: cat.trim(),
        price: parseFloat(price), stock: parseInt(stock),
        ...(inventoryItemId ? { inventoryItemId } : {}),
      };
      if (finalImageUrl) data.imageUrl = finalImageUrl;
      if (editItem) await updateItem(uid, editItem.id, data);
      else await addItem(uid, data);
      onClose();
    } catch (e: any) {
      console.error('[Menu Save Error]', e?.code, e?.message, e);
      setErr(e?.message ?? 'May error. Subukan muli.');
    }
    setSaving(false);
  };

  const del = () => Alert.alert('Burahin?', `Tanggalin ang ${editItem?.name}?`, [
    { text: 'Hindi', style: 'cancel' },
    { text: 'Oo', style: 'destructive', onPress: async () => { await deleteItem(uid, editItem!.id); onClose(); } },
  ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={ms.overlay}>
        <ScrollView style={ms.sheet} contentContainerStyle={ms.sheetContent} showsVerticalScrollIndicator={false}>

          <Text style={ms.title}>{editItem ? 'I-edit ang Item' : 'Bagong Menu Item'}</Text>

          {/* Photo */}
          <View style={ms.photoRow}>
            <TouchableOpacity
              style={imageUri ? ms.photoFilled : ms.photoEmpty}
              onPress={() => Alert.alert('Larawan', 'Piliin', [
                { text: 'Camera', onPress: () => pickImage('camera') },
                { text: 'Gallery', onPress: () => pickImage('gallery') },
                ...(imageUri ? [{ text: 'Alisin', style: 'destructive' as const, onPress: () => setImageUri(null) }] : []),
                { text: 'Cancel', style: 'cancel' },
              ])}
            >
              {imageUri
                ? <Image source={{ uri: imageUri }} style={ms.photoImg} resizeMode="cover" />
                : <><CameraIcon size={22} color={Colors.ink3} /><Text style={ms.photoHint}>Photo{'\n'}(optional)</Text></>
              }
            </TouchableOpacity>
          </View>

          {/* Item from inventory */}
          <View>
            <Text style={ms.label}>Item (mula sa Inventory)</Text>
            {inventoryItems.length === 0
              ? <Text style={ms.hint}>Walang inventory items pa.</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                  <View style={ms.chipRow}>
                    {inventoryItems.map(inv => (
                      <TouchableOpacity
                        key={inv.id}
                        style={[ms.chip, name === inv.name && ms.chipActive]}
                        onPress={() => {
                          setName(inv.name);
                          setStock(String(inv.stock));   // auto-fill stock
                          setInventoryItemId(inv.id);    // link to inventory
                          setErr('');
                        }}
                      >
                        <Text style={[ms.chipText, name === inv.name && ms.chipTextActive]}>{inv.name}</Text>
                        <Text style={ms.chipSub}>{inv.stock} {inv.unit}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )
            }
            <TextInput
              style={ms.input}
              value={name}
              onChangeText={v => { setName(v); setErr(''); }}
              placeholder="O mag-type ng custom na pangalan…"
              placeholderTextColor={Colors.ink3}
            />
          </View>

          {/* Category picker — select only */}
          <View>
            <Text style={ms.label}>Category</Text>
            {categories.length === 0
              ? <Text style={ms.hint}>Walang categories pa. I-close ito at i-manage ang Categories muna.</Text>
              : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={ms.chipRow}>
                    {categories.map(c => (
                      <TouchableOpacity
                        key={c}
                        style={[ms.chip, cat === c && ms.chipActive]}
                        onPress={() => { setCat(c); setErr(''); }}
                      >
                        <Text style={[ms.chipText, cat === c && ms.chipTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )
            }
          </View>

          {/* Price + Stock */}
          <View style={ms.row}>
            <View style={{ flex: 1 }}>
              <Text style={ms.label}>Presyo (₱)</Text>
              <TextInput style={ms.input} value={price} onChangeText={v => { setPrice(v); setErr(''); }}
                keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.ink3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ms.label}>Stock {inventoryItemId ? '(from inventory)' : ''}</Text>
              <TextInput
                style={[ms.input, inventoryItemId && { backgroundColor: Colors.bgInput, color: Colors.ink3 }]}
                value={stock}
                onChangeText={v => { if (!inventoryItemId) { setStock(v); setErr(''); } }}
                keyboardType="numeric" placeholder="0"
                placeholderTextColor={Colors.ink3}
                editable={!inventoryItemId}
              />
              {!!inventoryItemId && <Text style={ms.stockHint}>Stock is managed by Inventory</Text>}
            </View>
          </View>

          {!!err && <Text style={ms.err}>{err}</Text>}

          <View style={ms.footer}>
            <TouchableOpacity style={ms.cancelBtn} onPress={onClose}><Text style={ms.cancelText}>Kanselahin</Text></TouchableOpacity>
            {editItem && <TouchableOpacity style={ms.delBtn} onPress={del}><TrashIcon size={18} color={Colors.danger} /></TouchableOpacity>}
            <TouchableOpacity style={[ms.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={ms.saveBtnText}>{editItem ? 'I-save' : 'Idagdag'}</Text>}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────
export default function MenuScreen() {
  const { user } = useAuthStore();
  const { items, loading, categories, deleteItem } = useMenuStore();
  const { items: inventoryItems } = useInventoryStore();
  const [itemModal, setItemModal]     = useState(false);
  const [catModal, setCatModal]       = useState(false);
  const [editItem, setEditItem]       = useState<MenuItem | null>(null);

  if (!user) return null;

  const grouped = categories
    .map(cat => ({ cat, items: items.filter(i => i.cat === cat) }))
    .filter(g => g.items.length > 0);

  // items with unknown/deleted category
  const orphans = items.filter(i => !categories.includes(i.cat));

  // Live stock from inventory (same logic as POS)
  const getLiveStock = (item: MenuItem) => {
    if (item.inventoryItemId) {
      const inv = inventoryItems.find(i => i.id === item.inventoryItemId);
      return inv?.stock ?? item.stock;
    }
    return item.stock;
  };

  const deleteCategory = (cat: string) => {
    const catItems = items.filter(i => i.cat === cat);
    Alert.alert(`Delete "${cat}"?`, `Mabubura ang lahat ng ${catItems.length} item sa category na ito.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: async () => {
        for (const item of catItems) await deleteItem(user.uid, item.id);
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Menu</Text>
          <Text style={s.sub}>{items.length} items · {categories.length} categories</Text>
        </View>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.catBtn} onPress={() => setCatModal(true)}>
            <TagIcon size={15} color={Colors.primary} />
            <Text style={s.catBtnText}>Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => {
            if (inventoryItems.length === 0) {
              Alert.alert(
                'Walang Inventory',
                'Mag-add muna ng items sa Inventory bago ka magdagdag ng menu item.',
                [{ text: 'OK' }],
              );
              return;
            }
            setEditItem(null);
            setItemModal(true);
          }}>
            <PlusIcon size={18} color={Colors.white} />
            <Text style={s.addBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : grouped.length === 0 && orphans.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Walang items pa</Text>
            <Text style={s.emptyBody}>Gumawa muna ng category, tapos mag-add ng items.</Text>
          </View>
        ) : (
          <>
            {grouped.map(group => (
              <View key={group.cat}>
                <View style={s.groupHeader}>
                  <Text style={s.groupLabel}>{group.cat}</Text>
                  <TouchableOpacity style={s.groupDelBtn} onPress={() => deleteCategory(group.cat)}>
                    <TrashIcon size={13} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
                {group.items.map((item: MenuItem) => {
                  const liveStock = getLiveStock(item);
                  return (
                    <TouchableOpacity key={item.id} style={s.row} onPress={() => { setEditItem(item); setItemModal(true); }} activeOpacity={0.75}>
                      {item.imageUrl
                        ? <Image source={{ uri: item.imageUrl }} style={s.thumb} resizeMode="cover" />
                        : <View style={s.thumbPlaceholder} />
                      }
                      <View style={{ flex: 1 }}>
                        <Text style={s.itemName}>{item.name}</Text>
                        <Text style={s.itemMeta}>₱{item.price} · stock: {liveStock}</Text>
                      </View>
                      {liveStock <= 5 && (
                        <View style={[s.lowBadge, liveStock === 0 && s.outBadge]}>
                          <Text style={[s.lowBadgeText, liveStock === 0 && s.outBadgeText]}>
                            {liveStock === 0 ? 'Out of Stock' : `${liveStock} left`}
                          </Text>
                        </View>
                      )}
                      <PencilSquareIcon size={18} color={Colors.ink3} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            {orphans.length > 0 && (
              <View>
                <Text style={s.groupLabel}>Uncategorized</Text>
                {orphans.map((item: MenuItem) => (
                  <TouchableOpacity key={item.id} style={s.row} onPress={() => { setEditItem(item); setItemModal(true); }} activeOpacity={0.75}>
                    <View style={s.thumbPlaceholder} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{item.name}</Text>
                      <Text style={s.itemMeta}>₱{item.price} · stock: {item.stock}</Text>
                    </View>
                    <PencilSquareIcon size={18} color={Colors.ink3} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <CategoriesModal visible={catModal} onClose={() => setCatModal(false)} uid={user.uid} />
      <ItemModal
        visible={itemModal}
        editItem={editItem}
        inventoryItems={inventoryItems}
        onClose={() => setItemModal(false)}
        uid={user.uid}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink },
  sub: { fontSize: FontSize.xs, color: Colors.ink3 },
  headerBtns: { flexDirection: 'row', gap: Spacing.sm },
  catBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primarySoft, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  catBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  addBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.ink },
  emptyBody: { fontSize: FontSize.sm, color: Colors.ink3, textAlign: 'center' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  groupLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink3, textTransform: 'uppercase', letterSpacing: 1 },
  groupDelBtn: { padding: 5, borderRadius: 6, backgroundColor: Colors.dangerSoft },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm, gap: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  thumbPlaceholder: { width: 52, height: 52, borderRadius: 10, backgroundColor: Colors.bgInput },
  itemName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.ink },
  itemMeta: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },
  lowBadge: { backgroundColor: Colors.warningSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  lowBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.warning },
  outBadge: { backgroundColor: Colors.dangerSoft },
  outBadgeText: { color: Colors.danger },
});

const cm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: Spacing.xxl, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: Colors.ink3, paddingVertical: Spacing.lg },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  catIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  catName: { flex: 1, fontSize: FontSize.base, fontWeight: '600', color: Colors.ink },
  catDel: { padding: 6 },
  addRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  addInput: { flex: 1, backgroundColor: Colors.bgInput, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.base, color: Colors.ink, borderWidth: 1, borderColor: Colors.border },
  addBtn: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  sheetContent: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxl },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink2, marginBottom: 6 },
  hint: { fontSize: FontSize.xs, color: Colors.ink3, marginBottom: Spacing.sm, fontStyle: 'italic' },
  stockHint: { fontSize: 10, color: Colors.primary, marginTop: 3, fontWeight: '600' },
  input: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.base, color: Colors.ink, borderWidth: 1, borderColor: Colors.border },
  photoRow: { alignItems: 'center' },
  photoEmpty: { width: 90, height: 90, borderRadius: 16, backgroundColor: Colors.bgInput, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoFilled: { width: 90, height: 90, borderRadius: 16, overflow: 'hidden' },
  photoImg: { width: 90, height: 90 },
  photoHint: { fontSize: 10, color: Colors.ink3, textAlign: 'center' },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: 2, paddingRight: Spacing.lg },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.bgInput, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center' },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  chipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink2 },
  chipTextActive: { color: Colors.primary },
  chipSub: { fontSize: 9, color: Colors.ink3, marginTop: 1 },
  row: { flexDirection: 'row', gap: Spacing.md },
  err: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.bgInput, alignItems: 'center' },
  cancelText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.ink2 },
  delBtn: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
