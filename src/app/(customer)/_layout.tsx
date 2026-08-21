import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useAppTheme } from "@/stores/theme-store";

// The send/location pages are pushed on top of the tab bar as a true "stack of
// pages": the tab screen below stays still while the new page slides in from
// the right (simple_push on iOS keeps the previous screen in place; on Android
// slide_from_right does the same). Location screens slide up from the bottom.
const PUSH_FROM_RIGHT = Platform.select({
  ios: "simple_push",
  default: "slide_from_right",
}) as "simple_push" | "slide_from_right";

export default function CustomerLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: PUSH_FROM_RIGHT,
        animationDuration: 220,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      <Stack.Screen name="send/create" options={{ animation: PUSH_FROM_RIGHT }} />
      <Stack.Screen name="send/[id]" options={{ animation: PUSH_FROM_RIGHT }} />
      <Stack.Screen name="food/index" />
      <Stack.Screen name="food/cart" />
      <Stack.Screen name="food/checkout" />
      <Stack.Screen name="food/merchant/[id]" />
      <Stack.Screen name="food/order/[id]" />
      <Stack.Screen name="ride/create" />
      <Stack.Screen name="ride/[id]" />
      <Stack.Screen name="jastip/create" />
      <Stack.Screen name="search" />
      <Stack.Screen name="account-detail" />
      <Stack.Screen name="language" />
      <Stack.Screen name="driver-register" />
      <Stack.Screen name="merchant-register" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="location-search" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="location-picker" options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}
