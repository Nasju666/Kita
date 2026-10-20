import { create } from 'zustand';
import { MenuItem } from './useMenuStore';

export type CartItem = {
  menuItem: MenuItem;
  qty: number;
};

type POSStore = {
  cart: Record<string, number>;  // menuItemId → qty
  orderNum: number;

  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getCartLines: (menu: MenuItem[]) => CartItem[];
  getTotal: (menu: MenuItem[]) => number;
  getItemCount: () => number;
  incrementOrder: () => void;
};

export const usePOSStore = create<POSStore>((set, get) => ({
  cart: {},
  orderNum: 1,

  addToCart: (item) => set((s) => ({
    cart: { ...s.cart, [item.id]: (s.cart[item.id] || 0) + 1 },
  })),

  removeFromCart: (itemId) => set((s) => {
    const qty = (s.cart[itemId] || 0) - 1;
    if (qty <= 0) {
      const { [itemId]: _, ...rest } = s.cart;
      return { cart: rest };
    }
    return { cart: { ...s.cart, [itemId]: qty } };
  }),

  clearCart: () => set({ cart: {} }),

  getCartLines: (menu) => {
    const { cart } = get();
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ menuItem: menu.find((m) => m.id === id)!, qty }))
      .filter((l) => l.menuItem);
  },

  getTotal: (menu) => {
    const { cart } = get();
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = menu.find((m) => m.id === id);
      return sum + (item?.price ?? 0) * qty;
    }, 0);
  },

  getItemCount: () =>
    Object.values(get().cart).reduce((s, q) => s + q, 0),

  incrementOrder: () => set((s) => ({ orderNum: s.orderNum + 1 })),
}));
