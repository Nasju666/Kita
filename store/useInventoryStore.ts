import { create } from 'zustand';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export type StockItem = {
  id: string;
  name: string;
  stock: number;
  unit: string;
  usage: number;
  status: 'ok' | 'low' | 'critical';
};

const calcStatus = (stock: number, usage: number): StockItem['status'] => {
  const days = usage > 0 ? stock / usage : 999;
  return days <= 1 ? 'critical' : days <= 3 ? 'low' : 'ok';
};

type InventoryStore = {
  items: StockItem[];
  loading: boolean;
  subscribe: (uid: string) => () => void;
  addItem: (uid: string, data: Omit<StockItem, 'id' | 'status'>) => Promise<void>;
  restockItem: (uid: string, id: string, amount: number, currentStock: number, usage: number) => Promise<void>;
  deductStock: (uid: string, id: string, qty: number, currentStock: number, usage: number) => Promise<void>;
  deleteItem: (uid: string, id: string) => Promise<void>;
};

export const useInventoryStore = create<InventoryStore>((set) => ({
  items: [],
  loading: true,

  subscribe: (uid) => {
    const unsub = onSnapshot(collection(db, 'inventory', uid, 'items'), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockItem));
      set({ items, loading: false });
    }, () => set({ loading: false }));
    return unsub;
  },

  addItem: async (uid, data) => {
    const status = calcStatus(data.stock, data.usage);
    await addDoc(collection(db, 'inventory', uid, 'items'), {
      ...data, status, updatedAt: serverTimestamp(),
    });
  },

  restockItem: async (uid, id, amount, currentStock, usage) => {
    const newStock = parseFloat((currentStock + amount).toFixed(2));
    const status = calcStatus(newStock, usage);
    await updateDoc(doc(db, 'inventory', uid, 'items', id), {
      stock: newStock, status, updatedAt: serverTimestamp(),
    });
  },

  deductStock: async (uid, id, qty, currentStock, usage) => {
    const newStock = Math.max(0, parseFloat((currentStock - qty).toFixed(2)));
    const status = calcStatus(newStock, usage);
    await updateDoc(doc(db, 'inventory', uid, 'items', id), {
      stock: newStock, status, updatedAt: serverTimestamp(),
    });
  },
  deleteItem: (uid, id) => deleteDoc(doc(db, 'inventory', uid, 'items', id)),
}));
