import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// ─── Types ───────────────────────────────────────────────────────
export type User = {
  uid: string;
  email: string;
  shopName: string;
  ownerName: string;
};

type AuthStore = {
  user: User | null;
  isLoading: boolean;
  isInitializing: boolean;   // true while Firebase checks persisted session
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, shopName: string, ownerName: string) => Promise<void>;
  updateProfile: (fields: Partial<Pick<User, 'shopName' | 'ownerName'>>) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initAuthListener: () => () => void;  // returns unsubscribe fn
};

// ─── Store ───────────────────────────────────────────────────────
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  isInitializing: true,
  error: null,

  // ── Login ──────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Fetch the user profile from Firestore
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (snap.exists()) {
        set({ user: snap.data() as User, isLoading: false });
      } else {
        // Profile missing — build a minimal one from auth data
        const fallback: User = {
          uid: cred.user.uid,
          email: cred.user.email ?? email,
          shopName: 'Aking Tindahan',
          ownerName: 'May-ari',
        };
        set({ user: fallback, isLoading: false });
      }
    } catch (e: any) {
      const msg = firebaseError(e.code);
      set({ isLoading: false, error: msg });
    }
  },

  // ── Signup ─────────────────────────────────────────────────────
  signup: async (email, password, shopName, ownerName) => {
    set({ isLoading: true, error: null });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const profile: User = {
        uid: cred.user.uid,
        email: email.trim(),
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
      };
      // Save profile to Firestore users collection
      await setDoc(doc(db, 'users', cred.user.uid), {
        ...profile,
        createdAt: serverTimestamp(),
      });
      set({ user: profile, isLoading: false });
    } catch (e: any) {
      const msg = firebaseError(e.code);
      set({ isLoading: false, error: msg });
    }
  },

  // ── Logout ─────────────────────────────────────────────────────
  logout: async () => {
    await signOut(auth);
    set({ user: null, error: null });
  },

  // ── Update Profile ────────────────────────────────────────────
  updateProfile: async (fields) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), { ...user, ...fields }, { merge: true });
    set({ user: { ...user, ...fields } });
  },

  clearError: () => set({ error: null }),

  // ── Auth state listener (called once in _layout.tsx) ───────────
  initAuthListener: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in — load their profile from Firestore
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            set({ user: snap.data() as User, isInitializing: false });
          } else {
            set({ user: null, isInitializing: false });
          }
        } catch {
          set({ user: null, isInitializing: false });
        }
      } else {
        // Not signed in
        set({ user: null, isInitializing: false });
      }
    });
    return unsubscribe;
  },
}));

// ─── Firebase error → readable Tagalog/English messages ──────────
function firebaseError(code: string, raw?: any): string {
  console.error('[Auth Error]', code, raw); // ← shows real error in Expo terminal
  switch (code) {
    case 'auth/invalid-email':
      return 'Mali ang format ng email.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Mali ang email o password.';
    case 'auth/email-already-in-use':
      return 'Ginamit na ang email na ito. Mag-login na lang.';
    case 'auth/weak-password':
      return 'Ang password ay dapat hindi bababa sa 6 na karakter.';
    case 'auth/network-request-failed':
      return 'Walang internet connection. Subukan muli.';
    case 'auth/too-many-requests':
      return 'Napakaraming pagsubok. Maghintay ng ilang minuto.';
    default:
      return `May nangyaring mali (${code}). Subukan muli.`;
  }
}
