import { create } from 'zustand';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export type Expense = {
  id: string;
  name: string;
  amount: number;
  cat: string;
  note: string;
  createdAt: any;
};

type ExpensesStore = {
  items: Expense[];
  loading: boolean;
  subscribe: (uid: string) => () => void;
  addExpense: (uid: string, data: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  deleteExpense: (uid: string, id: string) => Promise<void>;
};

export const useExpensesStore = create<ExpensesStore>((set) => ({
  items: [],
  loading: true,

  subscribe: (uid) => {
    const unsub = onSnapshot(
      query(collection(db, 'expenses', uid, 'transactions'), orderBy('createdAt', 'desc')),
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
        set({ items, loading: false });
      },
      () => set({ loading: false }),
    );
    return unsub;
  },

  addExpense: (uid, data) =>
    addDoc(collection(db, 'expenses', uid, 'transactions'), {
      ...data, createdAt: serverTimestamp(),
    }).then(() => {}),

  deleteExpense: (uid, id) => deleteDoc(doc(db, 'expenses', uid, 'transactions', id)),
}));
