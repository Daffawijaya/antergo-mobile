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

import { PushNotificationManager } from "@/components/push-notification-manager";
import { Colors } from "@/constants/colors";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth-store";

import "@/lib/driver-location-service";
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

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);
  if (!isHydrated)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected
        guard={
          !!user && activeRole === "customer" && user.roles.includes("customer")
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
          !!user && activeRole === "merchant" && user.roles.includes("merchant")
        }
      >
        <Stack.Screen name="(merchant)" />
      </Stack.Protected>
    </Stack>
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
        <PushNotificationManager />
        <Router />
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
