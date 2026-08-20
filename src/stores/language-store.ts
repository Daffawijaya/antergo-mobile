import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type Language = "id" | "en";

type LanguageState = {
  language: Language;
  hydrated: boolean;
  restore: () => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
};

const STORAGE_KEY = "antergo-language";

export const useLanguageStore = create<LanguageState>((set) => ({
  language: "id",
  hydrated: false,
  restore: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const language = stored === "en" ? "en" : "id";
    set({ language, hydrated: true });
  },
  setLanguage: async (language) => {
    set({ language });
    await AsyncStorage.setItem(STORAGE_KEY, language);
  },
}));

/** Human-readable labels for each language option. */
export const LANGUAGE_LABELS: Record<Language, Record<Language, string>> = {
  id: { id: "Bahasa Indonesia", en: "English" },
  en: { id: "Bahasa Indonesia", en: "English" },
};
