import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, FlatList, Dimensions, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import {
  ShoppingCartIcon, TrashIcon,
  PlusIcon, MinusIcon, ArrowLeftIcon, XMarkIcon,
} from '../../components/Icons';
import { useAuthStore } from '../../store/useAuthStore';
import { usePOSStore } from '../../store/usePOSStore';
import { useMenuStore, MenuItem } from '../../store/useMenuStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';

const { width: W, height: H } = Dimensions.get('window');
const CARD_W = (W - Spacing.lg * 2 - Spacing.sm * 2) / 3;


// ─── Item Card ────────────────────────────────────────────────────
const ItemCard = ({ item, qty, liveStock, onAdd }: { item: MenuItem; qty: number; liveStock: number; onAdd: () => void }) => {
  const lowStock   = liveStock > 0 && liveStock <= 5;
  const outOfStock = liveStock === 0;
  return (
    <TouchableOpacity
      style={[styles.itemCard, qty > 0 && styles.itemCardActive, outOfStock && styles.itemCardOut]}
      onPress={onAdd}
      disabled={outOfStock}
      activeOpacity={0.75}
    >
      {/* Item image */}
      {item.imageUrl
        ? <Image source={{ uri: item.imageUrl }} style={styles.itemImg} resizeMode="contain" />
        : <View style={styles.itemImgPlaceholder} />
      }
      {qty > 0 && (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyBadgeText}>{qty}</Text>
        </View>
      )}
      {!qty && lowStock && (
        <View style={[styles.stockBadge, { backgroundColor: Colors.warningSoft }]}>
          <Text style={[styles.stockBadgeText, { color: Colors.warning }]}>{liveStock} left</Text>
        </View>
      )}
      {!qty && outOfStock && (
        <View style={[styles.stockBadge, { backgroundColor: Colors.dangerSoft }]}>
          <Text style={[styles.stockBadgeText, { color: Colors.danger }]}>Out of Stock</Text>
        </View>
      )}
      <Text style={styles.itemCat}>{item.cat}</Text>
      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.itemPrice}>₱{item.price}</Text>
    </TouchableOpacity>
  );
};

// ─── Cart Bottom Sheet ────────────────────────────────────────────
const CartSheet = ({
  visible, onClose, onCheckout,
  cartLines, total, itemCount,
  addToCart, removeFromCart, clearCart, orderNum,
}: any) => {
  const { t } = useLanguageStore();
  return (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.sheetOverlay}>
      <TouchableOpacity style={styles.sheetBackdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* Header */}
        <View style={styles.sheetHead}>
          <View>
            <Text style={styles.sheetTitle}>Order #{orderNum}</Text>
            <Text style={styles.sheetSub}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            {itemCount > 0 && (
              <TouchableOpacity onPress={clearCart} style={styles.sheetClearBtn}>
                <TrashIcon size={18} color={Colors.danger} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.sheetClearBtn}>
              <XMarkIcon size={18} color={Colors.ink2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cart Lines */}
        <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
          {cartLines.length === 0 ? (
            <View style={styles.emptyState}>
              <ShoppingCartIcon size={40} color={Colors.ink3} />
              <Text style={styles.emptyText}>{t.cartEmpty}</Text>
              <Text style={styles.emptySub}>{t.cartEmptyBody}</Text>
            </View>
          ) : (
            cartLines.map(({ menuItem, qty }: any) => (
              <View key={menuItem.id} style={styles.cartLine}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartLineName}>{menuItem.name}</Text>
                  <Text style={styles.cartLineUnit}>₱{menuItem.price} × {qty}</Text>
                </View>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(menuItem.id)}>
                    <MinusIcon size={14} color={Colors.ink} />
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(menuItem)}>
                    <PlusIcon size={14} color={Colors.ink} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartLineTotal}>₱{(menuItem.price * qty).toLocaleString()}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.sheetFoot}>
          <View style={styles.sheetTotalRow}>
            <Text style={styles.sheetTotalLabel}>Total</Text>
            <Text style={styles.sheetTotalAmt}>₱{total.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutBtn, cartLines.length === 0 && styles.checkoutBtnOff]}
            onPress={onCheckout}
            disabled={cartLines.length === 0}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutBtnText}>{t.checkout}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
  );
};

// ─── POS Screen ───────────────────────────────────────────────────
export default function POSScreen() {
  const { user, isInitializing } = useAuthStore();
  const router = useRouter();
  const { items: menu } = useMenuStore();
  const { items: inventoryItems } = useInventoryStore();
  const { t } = useLanguageStore();
  const { cart, addToCart, removeFromCart, clearCart,
    getCartLines, getTotal, getItemCount, orderNum } = usePOSStore();

  const [activeCat, setActiveCat] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);

  if (isInitializing) return null;
  if (!user) return <Redirect href="/login" />;

  // Get live stock from inventory if item is linked
  const getLiveStock = (item: MenuItem) => {
    if (item.inventoryItemId) {
      const inv = inventoryItems.find(i => i.id === item.inventoryItemId);
      return inv?.stock ?? item.stock;
    }
    return item.stock;
  };

  const handleAddToCart = (item: MenuItem) => {
    const live = getLiveStock(item);
    const inCart = cart[item.id] || 0;
    if (inCart >= live) return; // prevent adding beyond stock
    addToCart(item);
  };

  const visible = activeCat === 'all' ? menu : menu.filter(m => m.cat === activeCat);
  const cartLines = getCartLines(menu);
  const total = getTotal(menu);
  const itemCount = getItemCount();

  // Derive unique categories from current menu
  const categories = [
    { id: 'all', label: t.allItems },
    ...[...new Set(menu.map(m => m.cat).filter(Boolean))].map(c => ({ id: c, label: c })),
  ];

  const handleCheckout = () => {
    setCartOpen(false);
    router.push('/checkout');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <ArrowLeftIcon size={22} color={Colors.ink2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t.posTitle}</Text>
          <Text style={styles.headerSub}>{t.orderNumber(orderNum)}</Text>
        </View>
        <TouchableOpacity style={styles.headerCartBtn} onPress={() => setCartOpen(true)}>
          <ShoppingCartIcon size={22} color={Colors.primary} />
          {itemCount > 0 && (
            <View style={styles.headerCartBubble}>
              <Text style={styles.headerCartBubbleText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Tabs — fixed height wrapper prevents expansion */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.tab, activeCat === c.id && styles.tabActive]}
              onPress={() => setActiveCat(c.id)}
            >
              <Text style={[styles.tabText, activeCat === c.id && styles.tabTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Item Grid — full width */}
      <FlatList
        key="grid-3"
        data={visible}
        keyExtractor={i => i.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: Spacing.sm }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            qty={cart[item.id] || 0}
            liveStock={getLiveStock(item)}
            onAdd={() => handleAddToCart(item)}
          />
        )}
      />

      {/* Floating Cart Bar */}
      {itemCount > 0 && (
        <TouchableOpacity style={styles.floatingBar} onPress={() => setCartOpen(true)} activeOpacity={0.9}>
          <View style={styles.floatingBarLeft}>
            <View style={styles.floatingBarBadge}>
              <Text style={styles.floatingBarBadgeText}>{itemCount}</Text>
            </View>
            <Text style={styles.floatingBarLabel}>{t.viewCart}</Text>
          </View>
          <Text style={styles.floatingBarTotal}>₱{total.toLocaleString()}</Text>
        </TouchableOpacity>
      )}

      {/* Cart Sheet */}
      <CartSheet
        visible={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        cartLines={cartLines}
        total={total}
        itemCount={itemCount}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        orderNum={orderNum}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 12, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerBackBtn: { marginRight: Spacing.md, padding: 4 },
  headerTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.ink },
  headerSub: { fontSize: FontSize.xs, color: Colors.ink3 },
  headerCartBtn: { padding: 4 },
  headerCartBubble: { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.primary, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  headerCartBubbleText: { color: Colors.white, fontSize: 10, fontWeight: '800' },

  // Tabs — wrapper View locks the height, ScrollView scrolls inside it
  tabsWrapper: { height: 52, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabsContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm, alignItems: 'center' },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.bgInput },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink2 },
  tabTextActive: { color: Colors.white },

  // Grid
  grid: { padding: Spacing.lg, paddingBottom: 100 },

  // Item Card
  itemCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, minHeight: 140 },
  itemCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  itemCardOut: { opacity: 0.4 },
  itemImg: { width: '100%', aspectRatio: 1, backgroundColor: Colors.bgInput },
  itemImgPlaceholder: { width: '100%', aspectRatio: 1, backgroundColor: Colors.bgInput },
  qtyBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.primary, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  qtyBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  stockBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  stockBadgeText: { fontSize: 10, fontWeight: '700' },
  itemCat: { fontSize: 10, color: Colors.ink3, marginBottom: 2, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  itemName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink, marginBottom: 4, lineHeight: 19, paddingHorizontal: Spacing.md },
  itemPrice: { fontSize: FontSize.base, fontWeight: '800', color: Colors.primary, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },

  // Floating cart bar
  floatingBar: { position: 'absolute', bottom: Spacing.xl, left: Spacing.lg, right: Spacing.lg, backgroundColor: Colors.ink, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 12 },
  floatingBarLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  floatingBarBadge: { backgroundColor: Colors.primary, borderRadius: 12, minWidth: 28, height: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  floatingBarBadgeText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '800' },
  floatingBarLabel: { color: Colors.white, fontSize: FontSize.base, fontWeight: '600' },
  floatingBarTotal: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '800' },

  // Cart Bottom Sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: H * 0.82, paddingBottom: Spacing.xl },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.ink },
  sheetSub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },
  sheetClearBtn: { padding: 6 },
  sheetBody: { flexGrow: 0 },

  // Cart line
  cartLine: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  cartLineName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink },
  cartLineUnit: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },
  cartLineTotal: { fontSize: FontSize.base, fontWeight: '700', color: Colors.ink, minWidth: 56, textAlign: 'right' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  qtyNum: { fontSize: FontSize.base, fontWeight: '700', color: Colors.ink, minWidth: 20, textAlign: 'center' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.ink2 },
  emptySub: { fontSize: FontSize.sm, color: Colors.ink3 },

  // Sheet footer
  sheetFoot: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.md },
  sheetTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTotalLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.ink2 },
  sheetTotalAmt: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.ink, letterSpacing: -1 },
  checkoutBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  checkoutBtnOff: { opacity: 0.4 },
  checkoutBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },
});
