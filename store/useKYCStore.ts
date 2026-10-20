import { create } from 'zustand';
import {
  doc, setDoc, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';

export type KYCStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type KYCRecord = {
  status: KYCStatus;
  submittedAt?: string;
  fullName: string;
  location: string;
  businessType: string;
  verificationMethod: 'basic' | 'permit';
  idFrontUrl: string;
  idBackUrl: string;
  selfieUrl: string;
  businessPhotoUrl: string;
  permitUrl?: string;
};

type KYCStore = {
  kyc: KYCRecord | null;
  isSubmitting: boolean;
  loadKYC: (uid: string) => Promise<void>;
  submitKYC: (
    uid: string,
    info: { fullName: string; location: string; businessType: string; verificationMethod: 'basic' | 'permit' },
    images: { idFront: string; idBack: string; selfie: string; businessPhoto: string; permit?: string },
  ) => Promise<void>;
};

async function uploadImage(uid: string, type: string, uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const storageRef = ref(storage, `kyc/${uid}/${type}.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export const useKYCStore = create<KYCStore>((set) => ({
  kyc: null,
  isSubmitting: false,

  loadKYC: async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'kyc', uid));
      set({ kyc: snap.exists() ? (snap.data() as KYCRecord) : null });
    } catch {
      set({ kyc: null });
    }
  },

  submitKYC: async (uid, info, images) => {
    set({ isSubmitting: true });
    try {
      const [idFrontUrl, idBackUrl, selfieUrl, businessPhotoUrl] = await Promise.all([
        uploadImage(uid, 'id-front', images.idFront),
        uploadImage(uid, 'id-back', images.idBack),
        uploadImage(uid, 'selfie', images.selfie),
        uploadImage(uid, 'business-photo', images.businessPhoto),
      ]);

      let permitUrl: string | undefined;
      if (images.permit) {
        permitUrl = await uploadImage(uid, 'permit', images.permit);
      }

      const record: KYCRecord = {
        ...info,
        status: 'pending',
        idFrontUrl,
        idBackUrl,
        selfieUrl,
        businessPhotoUrl,
        ...(permitUrl ? { permitUrl } : {}),
        submittedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'kyc', uid), { ...record, submittedAt: serverTimestamp() });
      set({ kyc: record, isSubmitting: false });

    } catch (e) {
      set({ isSubmitting: false });
      throw e;
    }
  },
}));
