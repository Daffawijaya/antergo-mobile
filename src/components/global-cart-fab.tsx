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

export function GlobalCartFab() {
  const router = useRouter();
  const pathname = usePathname();

  const totalCartItems = useCartStore((s) => s.totalItems());

  // Don't render at all on hidden routes or when cart is empty
  const shouldHide = HIDDEN_ROUTES.some((route) => pathname.includes(route));
  if (shouldHide || totalCartItems === 0) return null;

  // Pathnames that do NOT have a visible tab bar (inner/detail pages)
  const INNER_ROUTES = [
    "food/merchant/",
    "food/cart",
    "food/checkout",
    "food/order/",
    "ride/create",
    "ride/",
    "chat/",
    "payments",
    "account-detail",
    "search",
    "driver-register",
    "merchant-register",
  ];
  const isInnerRoute =
    INNER_ROUTES.some((r) => pathname.includes(r)) ||
    pathname.endsWith("/food") ||
    pathname.endsWith("/food/");
  const fabBottom = isInnerRoute ? "bottom-7" : "bottom-24";

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(customer)/food/cart",
        })
      }
      className={`absolute ${fabBottom} right-5 h-14 w-14 items-center justify-center rounded-xl bg-white`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
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
