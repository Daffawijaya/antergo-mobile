import type { PropsWithChildren } from "react";
import { StatusBar, View } from "react-native";
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
          barStyle={mode === "dark" ? "light-content" : "dark-content"}
          translucent
          backgroundColor="transparent"
        />
        {children}
      </View>
    </VariableContextProvider>
  );
}