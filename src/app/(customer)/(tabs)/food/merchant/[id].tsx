import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { Button, Notice, StatusState } from "@/components/ui";
import { useTranslation } from "@/i18n";
import { Colors } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { getMerchantDetail } from "@/lib/api/food";
import { foodKeys } from "@/lib/food-query-keys";
import { formatRupiah } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import { useAppTheme } from "@/stores/theme-store";
import type { Product } from "@/types/api";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* ------------------------------------------------------------------ */
/*  Category helpers                                                  */
/* ------------------------------------------------------------------ */

type CategoryKey = "makanan" | "minuman" | "lainnya";

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  makanan: "Makanan",
  minuman: "Minuman",
  lainnya: "Lainnya",
};

const CATEGORY_ORDER: CategoryKey[] = ["makanan", "minuman", "lainnya"];

function normalizeCategory(raw: string | null | undefined): CategoryKey {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "makanan") return "makanan";
  if (v === "minuman") return "minuman";
  return "lainnya";
}

function groupByCategory(products: Product[]): Map<CategoryKey, Product[]> {
  const map = new Map<CategoryKey, Product[]>();
  for (const key of CATEGORY_ORDER) map.set(key, []);
  for (const p of products) {
    const key = normalizeCategory(p.category);
    map.get(key)!.push(p);
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  Product list row                                                  */
/* ------------------------------------------------------------------ */

function ProductRow({
  product,
  disabled,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
  isLast,
  colors,
}: {
  product: Product;
  disabled: boolean;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  isLast: boolean;
  colors: { surface: string; border: string; text: string; muted: string };
}) {
  const hasItem = quantity > 0;
  const isOutOfStock = product.stock === 0;

  return (
    <View style={isOutOfStock ? { opacity: 0.5 } : {}}>
      <View className="relative flex-row items-start gap-3 py-3 pr-20">
        {/* Product image */}
        <View className="h-[108px] w-[108px]">
          {product.image ? (
            <Image
              source={{ uri: product.image }}
              className="h-full w-full rounded-[14px]"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center rounded-[14px] bg-surface-muted">
              <Text className="text-[43px]">
                {product.product_type === "goods" ? "🛍️" : "🍜"}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-1 gap-0.5">
          <Text
            numberOfLines={1}
            className="text-[13px] leading-[18px] text-muted"
          >
            {product.name}
          </Text>
          <Text className="font-semibold text-[15px] text-foreground">
            {formatRupiah(product.price)}
          </Text>
          {isOutOfStock && (
            <Text className="text-[13px] text-red-500">Nggak tersedia</Text>
          )}
        </View>

        {/* Plus button / counter — absolute bottom-right of the row */}
        {!isOutOfStock && (
          <View className="absolute bottom-3 right-3">
            {hasItem ? (
              <View
                className="flex-row items-center rounded-full border border-brand"
                style={{ backgroundColor: "rgba(255,255,255,0.92)" }}
              >
                <Pressable
                  disabled={disabled}
                  onPress={onDecrement}
                  className="h-7 w-7 items-center justify-center"
                >
                  <Text className="font-bold text-base text-foreground">−</Text>
                </Pressable>
                <Text className="min-w-[14px] text-center font-bold text-sm text-foreground">
                  {quantity}
                </Text>
                <Pressable
                  disabled={disabled}
                  onPress={onIncrement}
                  className="h-7 w-7 items-center justify-center"
                >
                  <Text className="font-bold text-base text-foreground">+</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                disabled={disabled}
                onPress={onAdd}
                className="h-8 w-8 items-center justify-center rounded-full bg-brand"
              >
                <Text className="font-bold text-lg leading-none text-white">
                  +
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
      {/* Divider */}
      {!isLast ? (
        <View className="h-px" style={{ backgroundColor: colors.border }} />
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function MerchantDetailScreen() {
  const { t } = useTranslation();
  const {
    id,
    service: rawService,
    returnTo,
  } = useLocalSearchParams<{
    id: string;
    service?: string;
    returnTo?: string;
  }>();
  const service = rawService === "shopping" ? "shopping" : "food";
  const merchantId = Number(id);
  const router = useRouter();
  const { colors } = useAppTheme();
  const addItem = useCartStore((s) => s.addItem);
  const replaceCart = useCartStore((s) => s.replaceCart);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const carts = useCartStore((s) => s.carts);
  const currentCart = carts[merchantId];
  const items = currentCart?.items ?? [];

  const query = useQuery({
    queryKey: [...foodKeys.merchant(merchantId), service],
    queryFn: () => getMerchantDetail(merchantId, service),
    enabled: merchantId > 0,
  });

  const products = query.data?.products ?? [];
  const grouped = groupByCategory(products);

  const add = (product: Product) => {
    const merchant = query.data;
    if (!merchant) return;
    // Use getState() to avoid stale closure
    const currentCarts = useCartStore.getState().carts;
    const existingItems = currentCarts[merchant.id]?.items ?? [];
    if (
      existingItems.length > 0 &&
      existingItems[0]?.product.product_type !== product.product_type
    ) {
      Alert.alert(
        "Ganti tipe produk?",
        "Keranjang lama akan dikosongkan karena hanya dapat memesan satu tipe produk per merchant.",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Ganti",
            style: "destructive",
            onPress: () => replaceCart(merchant, product),
          },
        ],
      );
    } else addItem(merchant, product);
  };

  const getQuantity = (productId: number) =>
    items.find((i) => i.product.id === productId)?.quantity ?? 0;

  const totalCartItems = items.reduce((n, item) => n + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const hasCart = totalCartItems > 0;

  const handleBack = () =>
    returnTo ? router.replace(returnTo as never) : router.back();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      {/* ---- Scrollable content ---- */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow pb-4 gap-3"
      >
        {/* Loading / Error states */}
        {query.isLoading ? (
          <StatusState type="loading" />
        ) : query.isError ? (
          <StatusState
            type="error"
            message={getApiErrorMessage(query.error)}
            action={
              <Button
                title="Coba lagi"
                variant="secondary"
                onPress={() => query.refetch()}
              />
            }
          />
        ) : query.data ? (
          <>
            {/* ---- Cover image + header ---- */}
            <View className="-mx-5 bg-surface-muted">
              {/* Cover image */}
              {query.data.cover_image ? (
                <Image
                  source={{ uri: query.data.cover_image }}
                  className="h-[100px] w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-[100px] w-full items-center justify-center bg-surface-muted"></View>
              )}

              {/* Header overlay */}
              <View className="absolute top-0 w-full px-4">
                <SafeAreaView edges={["top"]}>
                  <View className="flex-row items-center gap-2 px-9 pb-2 pt-5">
                    <Pressable
                      accessibilityLabel="Kembali"
                      onPress={handleBack}
                      className="ml-0.5 h-10 w-10 items-center justify-center rounded-full bg-black/30"
                    >
                      <AppIcon name="back" size={22} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </SafeAreaView>
              </View>
            </View>

            {/* ---- Merchant card (overlapping cover) ---- */}
            <View
              className="-mt-6 mx-4 flex-row overflow-hidden rounded-2xl p-3"
              style={{
                backgroundColor: colors.surface,
                shadowColor: "#111827",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.07,
                shadowRadius: 14,
                elevation: 6,
              }}
            >
              {query.data.logo ? (
                <Image
                  source={{ uri: query.data.logo }}
                  className="h-[100px] w-[100px] rounded-[14px]"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-[100px] w-[100px] items-center justify-center rounded-[14px] bg-surface-muted">
                  <AppIcon name="store" size={32} color={Colors.primaryDark} />
                </View>
              )}

              <View className="flex-1 justify-center gap-0 px-3">
                <Text
                  numberOfLines={1}
                  className="font-bold text-lg text-foreground"
                >
                  {query.data.name}
                </Text>
                {query.data.address ? (
                  <Text
                    numberOfLines={1}
                    className="text-[13px] leading-[16px] text-muted"
                  >
                    {query.data.address}
                  </Text>
                ) : null}
                <View className="flex-row items-center gap-1">
                  <Text style={{ color: "#F59E0B", fontSize: 13 }}>★</Text>
                  <Text className="font-bold text-[13px] text-foreground">
                    {query.data.average_rating > 0
                      ? query.data.average_rating.toLocaleString("id-ID", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })
                      : "-"}
                  </Text>
                  <Text className="text-[12px] text-muted">
                    ({query.data.rating_count})
                  </Text>
                </View>
              </View>
            </View>

            {/* ---- Products by category ---- */}
            <View className="px-4">
              {!(query.data.products ?? []).length ? (
                <StatusState
                  type="empty"
                  message="Belum ada produk tersedia."
                />
              ) : (
                <>
                  {CATEGORY_ORDER.map((catKey) => {
                    const prods = grouped.get(catKey) ?? [];
                    if (prods.length === 0) return null;
                    return (
                      <View key={catKey}>
                        <Text className="mt-4 mb-2 font-bold text-[17px] text-foreground">
                          {CATEGORY_LABELS[catKey]}
                        </Text>
                        <View
                          className="rounded-2xl"
                          style={{ backgroundColor: colors.surface }}
                        >
                          {prods.map((product, idx) => {
                            const qty = getQuantity(product.id);
                            return (
                              <ProductRow
                                key={product.id}
                                product={product}
                                quantity={qty}
                                isLast={idx === prods.length - 1}
                                disabled={
                                  product.stock <= 0 ||
                                  !query.data!.is_open ||
                                  !query.data!.is_active
                                }
                                onAdd={() => add(product)}
                                onIncrement={() => add(product)}
                                onDecrement={() =>
                                  setQuantity(merchantId, product.id, qty - 1)
                                }
                                colors={colors}
                              />
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          </>
        ) : (
          <Notice>{t("food.storeNotFound")}</Notice>
        )}
      </ScrollView>

      {/* ---- Sticky cart bar at bottom ---- */}
      {hasCart ? (
        <View
          className="px-4 pb-4"
          style={{ backgroundColor: colors.background }}
        >
          <Pressable
            className="flex-row items-center justify-between rounded-full bg-brand px-5 py-3.5"
            onPress={() =>
              router.push({
                pathname: "/(customer)/(tabs)/food/cart",
                params: { service, merchantId: String(merchantId) },
              })
            }
          >
            {/* Left: Keranjang • N pesanan */}
            <Text className="text-sm text-white">
              <a className="font-bold">Keranjang •</a> {totalCartItems} Pesanan
            </Text>

            {/* Right: price */}
            <Text className="font-bold text-sm text-white">
              {formatRupiah(totalPrice)}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
