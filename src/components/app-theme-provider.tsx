import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { VariableContextProvider } from "react-native-css";

import { useAppTheme } from "@/stores/theme-store";

export function AppThemeProvider({ children }: PropsWithChildren) {
  const { colors, mode } = useAppTheme();

  return (
    <VariableContextProvider
      value={{
        "--app-background": colors.background,
        "--app-surface": colors.surface,
        "--app-surface-muted": colors.surfaceMuted,
        "--app-foreground": colors.text,
        "--app-muted": colors.muted,
        "--app-border": colors.border,
      }}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar
          animated
          style={mode === "dark" ? "light" : "dark"}
        />
        {children}
      </View>
    </VariableContextProvider>
  );
}