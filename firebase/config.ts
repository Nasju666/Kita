import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAZMaWszDRU-86aEc1NPZvQr7JVvy8ZF9o',
  authDomain: 'junas-palautog.firebaseapp.com',
  projectId: 'junas-palautog',
  storageBucket: 'junas-palautog.firebasestorage.app',
  messagingSenderId: '176019744026',
  appId: '1:176019744026:web:8c7eb4f56ae585f8bb38a3',
};

// Only initialize once — hot reloads will reuse the existing app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth can only be called once per app instance
// On hot reload the app already exists, so use getAuth() instead
export const auth = getApps().length > 1
  ? getAuth(app)
  : (() => {
      try {
        return initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch {
        // Already initialized (e.g. fast refresh)
        return getAuth(app);
      }
    })();

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
