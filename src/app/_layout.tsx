import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/outfit";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppThemeProvider } from "@/components/app-theme-provider";
import { PushNotificationManager } from "@/components/push-notification-manager";
import { QueryLifecycleManager } from "@/components/query-lifecycle-manager";
import { Colors } from "@/constants/colors";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth-store";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import { useThemeStore } from "@/stores/theme-store";
import { useLanguageStore } from "@/stores/language-store";

import "@/lib/driver-location-service";
import "../../global.css";
const AppText = Text as typeof Text & { defaultProps?: { style?: object } };
const AppTextInput = TextInput as typeof TextInput & {
  defaultProps?: { style?: object };
};
AppText.defaultProps = {
  ...AppText.defaultProps,
  style: { fontFamily: "Outfit_400Regular" },
};
AppTextInput.defaultProps = {
  ...AppTextInput.defaultProps,
  style: { fontFamily: "Outfit_400Regular" },
};

function Router() {
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const mode = useThemeStore((state) => state.mode);
  const restoreTheme = useThemeStore((state) => state.restore);
  const restoreLanguage = useLanguageStore((state) => state.restore);

  useEffect(() => {
    void restoreSession();
    void restoreTheme();
    void restoreLanguage();
  }, [restoreSession, restoreTheme, restoreLanguage]);
  // Once the session is restored, activate GPS right away and capture the
  // user's current location so every create screen can pre-fill its pickup
  // field (lokasi jemput) without asking again.
  useEffect(() => {
    if (isHydrated && user) {
      void useLocationPickerStore.getState().refreshCurrentLocation();
    }
  }, [isHydrated, user]);
  const langHydrated = useLanguageStore((state) => state.hydrated);

  if (!isHydrated || !langHydrated)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: mode === "dark" ? "#121313" : Colors.background,
          },
        }}
      >
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected
          guard={
            !!user &&
            activeRole === "customer" &&
            user.roles.includes("customer")
          }
        >
          <Stack.Screen name="(customer)" />
        </Stack.Protected>
        <Stack.Protected
          guard={
            !!user && activeRole === "driver" && user.roles.includes("driver")
          }
        >
          <Stack.Screen name="(driver)" />
        </Stack.Protected>
        <Stack.Protected
          guard={
            !!user &&
            activeRole === "merchant" &&
            user.roles.includes("merchant")
          }
        >
          <Stack.Screen name="(merchant)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <QueryLifecycleManager />
          <PushNotificationManager />
          <Router />
        </AppThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
