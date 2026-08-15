import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type ThemeMode = "light" | "dark";

type ThemeState = {
  mode: ThemeMode;
  hydrated: boolean;
  restore: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const STORAGE_KEY = "antergo-theme";

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "light",
  hydrated: false,
  restore: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const mode = stored === "dark" ? "dark" : "light";
    set({ mode, hydrated: true });
  },
  setMode: async (mode) => {
    set({ mode });
    await AsyncStorage.setItem(STORAGE_KEY, mode);
  },
}));

export const lightTheme = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F3F3",
  text: "#171717",
  muted: "#6B7280",
  border: "#E5E7EB",
} as const;

export const darkTheme = {
  background: "#121313",
  surface: "#1B1B1B",
  surfaceMuted: "#242525",
  text: "#F5F5F5",
  muted: "#A3A3A3",
  border: "#343535",
} as const;

export function useAppTheme() {
  const mode = useThemeStore((state) => state.mode);
  return { mode, colors: mode === "dark" ? darkTheme : lightTheme };
}
