import { create } from 'zustand';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, writeBatch, setDoc, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// cat is now a free-form string — user defines their own categories
export type MenuItem = {
  id: string;
  name: string;
  price: number;
  cat: string;
  stock: number;
  imageUrl?: string;
  inventoryItemId?: string;  // links to inventory for live stock tracking
};

type MenuStore = {
  items: MenuItem[];
  loading: boolean;
  categories: string[];
  subscribe: (uid: string) => () => void;
  subscribeCategories: (uid: string) => () => void;
  addItem: (uid: string, item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateItem: (uid: string, id: string, updates: Partial<Omit<MenuItem, 'id'>>) => Promise<void>;
  deleteItem: (uid: string, id: string) => Promise<void>;
  addCategory: (uid: string, name: string) => Promise<void>;
  removeCategory: (uid: string, name: string) => Promise<void>;
};

export const useMenuStore = create<MenuStore>((set, get) => ({
  items: [],
  loading: true,
  categories: [],

  subscribe: (uid) => {
    const unsub = onSnapshot(
      collection(db, 'menu', uid, 'items'),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem));
        set({ items, loading: false });
      },
      () => set({ loading: false }),
    );
    return unsub;
  },

  subscribeCategories: (uid) => {
    const ref = doc(db, 'menuCategories', uid);
    const unsub = onSnapshot(ref, (snap) => {
      const cats = snap.exists() ? (snap.data().categories ?? []) : [];
      set({ categories: cats });
    });
    return unsub;
  },

  addCategory: async (uid, name) => {
    const cats = get().categories;
    if (cats.includes(name)) return;
    await setDoc(doc(db, 'menuCategories', uid), { categories: [...cats, name] });
  },

  removeCategory: async (uid, name) => {
    const cats = get().categories.filter(c => c !== name);
    await setDoc(doc(db, 'menuCategories', uid), { categories: cats });
  },

  addItem: (uid, item) =>
    addDoc(collection(db, 'menu', uid, 'items'), {
      ...item, createdAt: serverTimestamp(),
    }).then(() => {}),

  updateItem: (uid, id, updates) =>
    updateDoc(doc(db, 'menu', uid, 'items', id), updates as any),

  deleteItem: (uid, id) =>
    deleteDoc(doc(db, 'menu', uid, 'items', id)),
}));
