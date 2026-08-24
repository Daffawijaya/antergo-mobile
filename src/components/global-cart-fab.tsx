import { useRouter, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { useCartStore } from "@/stores/cart-store";

/** Routes where the global cart FAB should be hidden. */
const HIDDEN_ROUTES = [
  "/food/merchant/",
  "/food/cart",
  "/food/checkout",
  "/food/order/",
];

export function GlobalCartFab({
  force = false,
  // Skip penyembunyian berbasis route: dipakai instance di tabs layout agar
  // FAB tetap terpasang saat navigasi (tidak hilang sebelum tertutup screen
  // baru yang sedang slide).
  alwaysVisible = false,
}: {
  force?: boolean;
  alwaysVisible?: boolean;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();

  const totalCartItems = useCartStore((s) => s.totalItems());

  // Don't render at all on hidden routes or when cart is empty.
  // The food/shopping list page renders its own FAB with `force` so it
  // slides with the screen transition.
  const shouldHide = alwaysVisible
    ? false
    : HIDDEN_ROUTES.some((route) => pathname.includes(route)) ||
      (!force &&
        (pathname.endsWith("/food") || pathname.endsWith("/food/")));
  if (shouldHide || totalCartItems === 0) return null;

  // Selalu terpasang (instance tabs) = posisi juga diam di atas tab bar,
  // jangan ikut berubah saat pathname pindah ke route inner.
  const fabBottom = force ? "bottom-8" : "bottom-28";

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(customer)/food/cart",
        })
      }
      className={`absolute ${fabBottom} right-5 h-14 w-14 items-center justify-center rounded-xl bg-white`}
      style={{
        // Setara shadow-md nativewind.
        boxShadow:
          "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
      }}
    >
      <AppIcon name="cart" size={24} color="#000000" />
      {/* Badge */}
      <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1">
        <Text className="font-bold text-[11px] text-white">
          {totalCartItems}
        </Text>
      </View>
    </Pressable>
  );
}
