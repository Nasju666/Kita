import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, Translations, translations } from '../constants/i18n';

const LANG_KEY = '@kita_language';

type LanguageStore = {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => Promise<void>;
  loadLanguage: () => Promise<void>;
};

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: 'taglish',
  t: translations['taglish'],

  setLanguage: async (lang) => {
    await AsyncStorage.setItem(LANG_KEY, lang);
    set({ language: lang, t: translations[lang] });
  },

  loadLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem(LANG_KEY);
      if (saved === 'taglish' || saved === 'english') {
        set({ language: saved, t: translations[saved] });
      }
    } catch {}
  },
}));
