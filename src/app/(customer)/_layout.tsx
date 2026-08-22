import { Stack } from "expo-router";
import { screenTransitions } from "@/constants/navigation";
import { useAppTheme } from "@/stores/theme-store";

export default function CustomerLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...screenTransitions.push,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={screenTransitions.none} />
      <Stack.Screen
        name="send/create"
        options={screenTransitions.overlayPush}
      />
      <Stack.Screen
        name="send/[id]"
        options={screenTransitions.overlayPush}
      />
      <Stack.Screen name="food/index" options={screenTransitions.overlayPush} />
      <Stack.Screen name="food/cart" />
      <Stack.Screen name="food/checkout" />
      <Stack.Screen name="food/merchant/[id]" />
      <Stack.Screen name="food/order/[id]" />
      <Stack.Screen name="ride/create" options={screenTransitions.overlayPush} />
      <Stack.Screen name="ride/[id]" />
      <Stack.Screen name="jastip/create" options={screenTransitions.overlayPush} />
      <Stack.Screen name="search" options={screenTransitions.slideDown} />
      <Stack.Screen name="account-detail" />
      <Stack.Screen name="language" />
      <Stack.Screen name="driver-register" />
      <Stack.Screen name="merchant-register" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="location-search" options={screenTransitions.modal} />
      <Stack.Screen name="location-picker" options={screenTransitions.modal} />
    </Stack>
  );
}
