import { useRouter, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";

/** Tab roots where the tabs-layout cart FAB is allowed to appear.
 *  The standalone `force` instance (food/product pages) ignores this. */
const VISIBLE_TABS = new Set(["/", "/orders", "/chat", "/profile"]);

export function GlobalCartFab({
  force = false,
}: {
  force?: boolean;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const activeRole = useAuthStore((s) => s.activeRole);

  const totalCartItems = useCartStore((s) => s.totalItems());

  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  const shouldHide =
    !force &&
    (activeRole !== "customer" || !VISIBLE_TABS.has(normalized));
  if (shouldHide || totalCartItems === 0) return null;

  // Instance tabs menempel di atas tab bar; instance `force` di halaman
  // tanpa tab bar melayang lebih rendah.
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
