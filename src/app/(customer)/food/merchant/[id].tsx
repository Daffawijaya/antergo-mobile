import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { CustomerPageHeader } from "@/components/customer-page";
import { Button, Notice, Screen, StatusState } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { getMerchantDetail } from "@/lib/api/food";
import { foodKeys } from "@/lib/food-query-keys";
import { formatRupiah } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import { useAppTheme } from "@/stores/theme-store";
import type { Product } from "@/types/api";

export default function MerchantDetailScreen() {
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
  const cartMerchant = useCartStore((s) => s.merchant);
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const replaceCart = useCartStore((s) => s.replaceCart);
  const query = useQuery({
    queryKey: [...foodKeys.merchant(merchantId), service],
    queryFn: () => getMerchantDetail(merchantId, service),
    enabled: merchantId > 0,
  });
  const add = (product: Product) => {
    const merchant = query.data;
    if (!merchant) return;
    if (
      cartMerchant &&
      (cartMerchant.id !== merchant.id ||
        items[0]?.product.product_type !== product.product_type)
    ) {
      Alert.alert(
        "Ganti merchant?",
        "Cart lama akan dikosongkan karena satu pesanan hanya dapat berasal dari satu merchant.",
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
  return (
    <Screen contentStyle={styles.screen}>
      <CustomerPageHeader
        title={query.data?.name ?? "Detail produk"}
        subtitle={service === "shopping" ? "Shopping" : "Food"}
        onBack={() =>
          returnTo ? router.replace(returnTo as never) : router.back()
        }
      />
      {items.length ? (
        <Pressable
          style={styles.cart}
          onPress={() =>
            router.push({
              pathname: "/(customer)/food/cart",
              params: { service },
            })
          }
        >
          <AppIcon name="cart" size={20} color="#FFFFFF" />
          <Text style={styles.cartText}>
            Lihat Cart ({items.reduce((n, item) => n + item.quantity, 0)})
          </Text>
        </Pressable>
      ) : null}
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
          <View
            style={[
              styles.merchantCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {query.data.logo ? (
              <Image source={{ uri: query.data.logo }} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <AppIcon name="store" size={30} color={Colors.primaryDark} />
              </View>
            )}
            <View style={styles.merchantCopy}>
              <Text style={[styles.merchantName, { color: colors.text }]}>
                {query.data.name}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.muted, { color: colors.muted }]}
              >
                {query.data.address ||
                  query.data.description ||
                  "Merchant AnterGo"}
              </Text>
              <Text
                style={
                  query.data.is_open && query.data.is_active
                    ? styles.open
                    : styles.closed
                }
              >
                {query.data.is_open && query.data.is_active ? "Buka" : "Tutup"}
              </Text>
            </View>
          </View>
          <Text style={[styles.heading, { color: colors.text }]}>
            Menu tersedia
          </Text>
          {!(query.data.products ?? []).length ? (
            <StatusState type="empty" message="Belum ada produk tersedia." />
          ) : (
            (query.data.products ?? []).map((product) => (
              <View
                key={product.id}
                style={[
                  styles.product,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.image} />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.emoji}>
                      {product.product_type === "goods" ? "🛍️" : "🍜"}
                    </Text>
                  </View>
                )}
                <View style={styles.productCopy}>
                  <Text
                    numberOfLines={2}
                    style={[styles.productName, { color: colors.text }]}
                  >
                    {product.name}
                  </Text>
                  {product.description ? (
                    <Text
                      numberOfLines={2}
                      style={[styles.muted, { color: colors.muted }]}
                    >
                      {product.description}
                    </Text>
                  ) : null}
                  <Text style={styles.price}>
                    {formatRupiah(product.price)}
                  </Text>
                  <Text
                    style={[styles.stock, product.stock <= 0 && styles.closed]}
                  >
                    {product.stock > 0 ? `Stok ${product.stock}` : "Stok habis"}
                  </Text>
                  <Button
                    compact
                    title={product.stock > 0 ? "Tambah" : "Stok habis"}
                    disabled={
                      product.stock <= 0 ||
                      !query.data!.is_open ||
                      !query.data!.is_active
                    }
                    onPress={() => add(product)}
                  />
                </View>
              </View>
            ))
          )}
        </>
      ) : (
        <Notice>Data merchant tidak ditemukan.</Notice>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 8, gap: 12 },
  cart: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.primaryDark,
  },
  cartText: { color: "#FFFFFF", fontFamily: "Outfit_700Bold" },
  merchantCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  logo: { width: 72, height: 72, borderRadius: 16 },
  logoFallback: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
  },
  merchantCopy: { flex: 1, gap: 3, justifyContent: "center" },
  merchantName: { fontSize: 19, fontFamily: "Outfit_700Bold" },
  muted: { fontSize: 13, lineHeight: 18, fontFamily: "Outfit_400Regular" },
  open: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontFamily: "Outfit_700Bold",
  },
  closed: { color: Colors.danger },
  heading: { fontSize: 21, fontFamily: "Outfit_700Bold", marginTop: 3 },
  product: {
    flexDirection: "row",
    gap: 12,
    padding: 11,
    borderRadius: 17,
    borderWidth: 1,
  },
  image: { width: 108, height: 108, borderRadius: 14 },
  imageFallback: {
    width: 108,
    height: 108,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
  },
  emoji: { fontSize: 43 },
  productCopy: { flex: 1, gap: 3 },
  productName: { fontSize: 17, lineHeight: 21, fontFamily: "Outfit_700Bold" },
  price: {
    color: Colors.primaryDark,
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },
  stock: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
  },
});
