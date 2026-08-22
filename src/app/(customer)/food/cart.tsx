import { useMemo as useThemeMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import {
  Button,
  Card,
  KeyValue,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import { formatRupiah } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";

export default function CartScreen() {
  const { styles } = useScreenStyles();
  const router = useRouter();
  const { merchantId: merchantIdParam, service: rawService } =
    useLocalSearchParams<{
      merchantId?: string;
      service?: string;
    }>();
  const merchantId = Number(merchantIdParam);
  const service = rawService === "shopping" ? "shopping" : "food";

  const carts = useCartStore((s) => s.carts);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const clearMerchant = useCartStore((s) => s.clearMerchant);
  const clearAll = useCartStore((s) => s.clearAll);
  const { t } = useTranslation();

  // Single merchant mode (when merchantId is provided)
  const singleCart = merchantId ? carts[merchantId] : undefined;
  const singleItems = singleCart?.items ?? [];

  // All merchants mode (when no merchantId)
  const allMerchantEntries = Object.values(carts).filter(
    (c) => c.items.length > 0,
  );

  const isSingleMode = !!merchantId && !!singleCart;

  const totalAllItems = allMerchantEntries.reduce(
    (sum, cart) => sum + cart.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );

  const totalAllPrice = allMerchantEntries.reduce(
    (sum, cart) =>
      sum +
      cart.items.reduce(
        (s, i) => s + Number(i.product.price) * i.quantity,
        0,
      ),
    0,
  );

  // Single merchant subtotal
  const singleSubtotal = singleItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );

  return (
    <Screen>
      <Button
        title={t("common.back")}
        variant="secondary"
        onPress={() => router.back()}
      />

      {isSingleMode ? (
        /* ---- Single merchant view ---- */
        <>
          <PageHeader
            eyebrow={
              singleItems[0]?.product.product_type === "goods"
                ? t("cart.shoppingCart")
                : t("cart.foodCart")
            }
            title={singleCart!.merchant.name}
            description={t("cart.subtotalPreview")}
          />
          {!singleItems.length ? (
            <StatusState
              type="empty"
              message={t("cart.empty")}
              action={
                <Button
                  title={t("cart.searchMerchant")}
                  onPress={() =>
                    router.replace({
                      pathname: "/(customer)/food",
                      params: { service },
                    })
                  }
                />
              }
            />
          ) : (
            <>
              {singleItems.map((item) => (
                <Card key={item.product.id}>
                  <Text style={styles.title}>{item.product.name}</Text>
                  <KeyValue
                    label={t("cart.pricePreview")}
                    value={formatRupiah(item.product.price)}
                  />
                  <KeyValue label={t("cart.stockKnown")} value={item.product.stock} />
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <Button
                        title="−"
                        variant="secondary"
                        onPress={() =>
                          setQuantity(
                            merchantId,
                            item.product.id,
                            item.quantity - 1,
                          )
                        }
                      />
                    </View>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <View style={styles.flex}>
                      <Button
                        title="+"
                        variant="secondary"
                        disabled={item.quantity >= item.product.stock}
                        onPress={() =>
                          setQuantity(
                            merchantId,
                            item.product.id,
                            item.quantity + 1,
                          )
                        }
                      />
                    </View>
                  </View>
                </Card>
              ))}
              <Card>
                <KeyValue
                  label={t("cart.subtotalPreviewLabel")}
                  value={formatRupiah(singleSubtotal)}
                />
                <Text style={styles.muted}>
                  {t("cart.checkoutNote")}
                </Text>
              </Card>
              <Button
                title={t("cart.checkout")}
                onPress={() =>
                  router.push({
                    pathname: "/(customer)/food/checkout",
                    params: { service, merchantId: String(merchantId) },
                  })
                }
              />
              <Button
                title={t("cart.clearCart")}
                variant="danger"
                onPress={() => clearMerchant(merchantId)}
              />
            </>
          )}
        </>
      ) : (
        /* ---- All merchants view ---- */
        <>
          <PageHeader
            eyebrow={t("cart.title")}
            title={t("cart.allOrders")}
            description={t("cart.allOrdersDesc")}
          />
          {!allMerchantEntries.length ? (
            <StatusState
              type="empty"
              message={t("cart.empty")}
              action={
                <Button
                  title={t("cart.startShopping")}
                  onPress={() =>
                    router.replace({
                      pathname: "/(customer)/food",
                      params: { service: "food" },
                    })
                  }
                />
              }
            />
          ) : (
            <>
              {allMerchantEntries.map((cart) => {
                const merchantSubtotal = cart.items.reduce(
                  (s, i) => s + Number(i.product.price) * i.quantity,
                  0,
                );
                const merchantItemCount = cart.items.reduce(
                  (s, i) => s + i.quantity,
                  0,
                );
                return (
                  <Pressable
                    key={cart.merchant.id}
                    onPress={() =>
                      router.push({
                        pathname: "/(customer)/food/cart",
                        params: {
                          merchantId: String(cart.merchant.id),
                          service: "food",
                        },
                      })
                    }
                    style={styles.merchantCard}

                  >
                    {/* Merchant header */}
                    <View style={styles.merchantHeader}>
                      {cart.merchant.logo ? (
                        <Image
                          source={{ uri: cart.merchant.logo }}
                          style={styles.merchantLogo}
                        />
                      ) : (
                        <View style={styles.merchantLogoPlaceholder}>
                          <AppIcon
                            name="store"
                            size={22}
                            color={Colors.primary}
                          />
                        </View>
                      )}
                      <View style={styles.merchantInfo}>
                        <Text style={styles.merchantName}>
                          {cart.merchant.name}
                        </Text>
                        <Text style={styles.merchantMeta}>
                          {merchantItemCount} item •{" "}
                          {formatRupiah(merchantSubtotal)}
                        </Text>
                      </View>
                    </View>

                    {/* Items list */}
                    {cart.items.map((item) => (
                      <View key={item.product.id} style={styles.itemRow}>
                        <View style={styles.flex}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {item.quantity}× {item.product.name}
                          </Text>
                        </View>
                        <Text style={styles.itemPrice}>
                          {formatRupiah(
                            Number(item.product.price) * item.quantity,
                          )}
                        </Text>
                      </View>
                    ))}
                  </Pressable>
                );
              })}

              {/* Grand total */}
              <Card>
                <KeyValue
                  label={`Total ${allMerchantEntries.length} ${t("home.umkmAnterGo")} • ${totalAllItems} item`}
                  value={formatRupiah(totalAllPrice)}
                />
                <Text style={styles.muted}>
                  {t("cart.checkoutNote")}
                </Text>
              </Card>

              <Button
                title={t("cart.clearAll")}
                variant="danger"
                onPress={() => {
                  if (confirm(t("cart.removeConfirm"))) clearAll();
                }}
              />
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    title: { color: colors.text, fontWeight: "800", fontSize: 17 },
    muted: { color: colors.muted, lineHeight: 20 },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    flex: { flex: 1 },
    quantity: {
      minWidth: 32,
      textAlign: "center",
      color: colors.text,
      fontWeight: "800",
      fontSize: 18,
    },
    /* All-merchants styles */
    merchantCard: {
      backgroundColor: colors.surface,
      borderRadius: 9,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    merchantHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
    },
    merchantLogo: {
      width: 44,
      height: 44,
      borderRadius: 9,
    },
    merchantLogoPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 9,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    merchantInfo: { flex: 1 },
    merchantName: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 16,
    },
    merchantMeta: {
      color: colors.muted,
      fontSize: 13,
      marginTop: 2,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    itemName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
    },
    itemPrice: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "600",
    },
  });
