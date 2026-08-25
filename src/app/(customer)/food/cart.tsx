import { useCallback, useEffect, useMemo as useThemeMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { AppIcon } from "@/components/app-icon";
import {
  BackButton,
  Button,
  Card,
  KeyValue,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { distanceMeters } from "@/lib/location";
import { useCartStore } from "@/stores/cart-store";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";

// ── Fee estimation constants ─────────────────────────────────────────────
const BASE_FARE = 5000;        // Rp5.000 base delivery fee
const PRICE_PER_KM = 2000;    // Rp2.000 per km
const PLATFORM_FEE_RATE = 0.08; // 8% platform fee

export default function CartScreen() {
  const { styles } = useScreenStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
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

  // ── Fee estimation (delivery fee based on distance + 8% platform fee) ──
  const currentLocation = useLocationPickerStore((s) => s.currentLocation);

  const estimateDeliveryFee = (
    merchantLat: string | null,
    merchantLng: string | null,
  ) => {
    if (!currentLocation || !merchantLat || !merchantLng) return 0;
    const dest = {
      latitude: Number(merchantLat),
      longitude: Number(merchantLng),
    };
    if (!Number.isFinite(dest.latitude) || !Number.isFinite(dest.longitude))
      return 0;
    const distM = distanceMeters(currentLocation.coordinate, dest);
    const km = Math.max(distM / 1000, 1); // minimum 1 km
    return Math.round(BASE_FARE + km * PRICE_PER_KM);
  };

  const computeTotals = (subtotal: number, deliveryFee: number) => {
    const platformFee = Math.round((subtotal + deliveryFee) * PLATFORM_FEE_RATE);
    return {
      subtotal,
      deliveryFee,
      platformFee,
      total: subtotal + deliveryFee + platformFee,
    };
  };

  // For single merchant view
  const singleDeliveryFee = isSingleMode
    ? estimateDeliveryFee(
        singleCart!.merchant.latitude,
        singleCart!.merchant.longitude,
      )
    : 0;
  const singleTotals = isSingleMode
    ? computeTotals(singleSubtotal, singleDeliveryFee)
    : null;

  // For all merchants view
  const allDeliveryFee = allMerchantEntries.reduce(
    (sum, cart) =>
      sum + estimateDeliveryFee(cart.merchant.latitude, cart.merchant.longitude),
    0,
  );
  const allTotals = !isSingleMode
    ? computeTotals(totalAllPrice, allDeliveryFee)
    : null;

  const displayTotals = singleTotals ?? allTotals;
  const grandTotal = displayTotals?.total ?? 0;

  // Panel turun dari atas saat dibuka, naik lagi saat ditutup. Halaman di
  // bawahnya tetap terlihat (transparentModal).
  const SCREEN_HEIGHT = Dimensions.get("window").height;
  const slideY = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  const leaving = useRef(false);

  useEffect(() => {
    Animated.timing(slideY, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideY]);

  const animateClose = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(slideY, {
      toValue: -SCREEN_HEIGHT,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => router.back());
  }, [router, slideY]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      animateClose();
      return true;
    });
    return () => sub.remove();
  }, [animateClose]);

  const hasItems = isSingleMode
    ? singleItems.length > 0
    : allMerchantEntries.length > 0;

  const goCheckout = useCallback(() => {
    if (isSingleMode) {
      router.push({
        pathname: "/(customer)/food/checkout",
        params: { service, merchantId: String(merchantId) },
      });
      return;
    }
    const first = allMerchantEntries[0];
    if (!first) return;
    router.push({
      pathname: "/(customer)/food/checkout",
      params: {
        service:
          first.items[0]?.product.product_type === "goods"
            ? "shopping"
            : "food",
        merchantId: String(first.merchant.id),
      },
    });
  }, [allMerchantEntries, isSingleMode, merchantId, router, service]);

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY: slideY }] }}>
    <Screen padded={false} scrollBottomPadding={false}>
      <View
        className="pb-6"
        style={{ paddingTop: insets.top + 8, paddingBottom: hasItems ? 110 : 24 }}
      >
      <View className="px-5">
      <BackButton onPress={animateClose} title={t("cart.title")} />
      </View>

      {isSingleMode ? (
        /* ---- Single merchant view ---- */
        <>
          <View className="px-5 gap-4">
          <PageHeader
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
              {singleTotals ? (
                <Card>
                  <Text style={styles.title}>{t("cart.orderSummary")}</Text>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>{t("cart.subtotal")}</Text>
                    <Text style={styles.feeValue}>{formatRupiah(singleTotals.subtotal)}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>{t("cart.deliveryFee")}</Text>
                    <Text style={styles.feeValue}>{formatRupiah(singleTotals.deliveryFee)}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>{t("cart.platformFee")}</Text>
                    <Text style={styles.feeValue}>{formatRupiah(singleTotals.platformFee)}</Text>
                  </View>
                  <View style={[styles.feeRow, styles.feeTotal]}>
                    <Text style={styles.feeLabelBold}>{t("cart.total")}</Text>
                    <Text style={styles.feeValueBold}>{formatRupiah(singleTotals.total)}</Text>
                  </View>
                  <Text style={styles.muted}>
                    {t("cart.estimatedFee")}
                  </Text>
                </Card>
              ) : null}
              <Button
                title={t("cart.clearCart")}
                variant="danger"
                onPress={() => clearMerchant(merchantId)}
              />
            </>
          )}
          </View>
        </>
      ) : (
        /* ---- All merchants view ---- */
        <>
          <View className="gap-4">
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
                return (
                  <View key={cart.merchant.id}>
                    {/* Merchant name — tanpa logo, tap untuk buka keranjang toko */}
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/(customer)/food/cart",
                          params: {
                            merchantId: String(cart.merchant.id),
                            service: "food",
                          },
                        })
                      }
                      className="py-3 px-5 active:opacity-70"
                    >
                      <Text style={styles.merchantName}>
                        {cart.merchant.name}
                      </Text>
                    </Pressable>

                    {/* Items — baris produk persis halaman detail UMKM */}
                    {cart.items.map((item) => (
                      <CartItemRow
                        key={item.product.id}
                        item={item}
                        merchantId={cart.merchant.id}
                        colors={colors}
                      />
                    ))}
                  </View>
                );
              })}

              {/* Grand total */}
              <View className="px-5 gap-4">
              {allTotals ? (
                <Card>
                  <Text style={styles.title}>
                    {`Total ${allMerchantEntries.length} ${t("home.umkmAnterGo")} • ${totalAllItems} item`}
                  </Text>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>{t("cart.subtotal")}</Text>
                    <Text style={styles.feeValue}>{formatRupiah(allTotals.subtotal)}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>{t("cart.deliveryFee")}</Text>
                    <Text style={styles.feeValue}>{formatRupiah(allTotals.deliveryFee)}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>{t("cart.platformFee")}</Text>
                    <Text style={styles.feeValue}>{formatRupiah(allTotals.platformFee)}</Text>
                  </View>
                  <View style={[styles.feeRow, styles.feeTotal]}>
                    <Text style={styles.feeLabelBold}>{t("cart.total")}</Text>
                    <Text style={styles.feeValueBold}>{formatRupiah(allTotals.total)}</Text>
                  </View>
                  <Text style={styles.muted}>
                    {t("cart.estimatedFee")}
                  </Text>
                </Card>
              ) : null}
              </View>
            </>
          )}
          </View>
        </>
      )}
      </View>
    </Screen>
    {hasItems ? (
      <CheckoutBar total={grandTotal} onPress={goCheckout} />
    ) : null}
    </Animated.View>
  );
}

/* Bar checkout sticky di bawah layar: kiri total harga + "Lihat detail",
   kanan tombol Lanjut ke Checkout. Pembungkus full-lebar layar. */
function CheckoutBar({
  total,
  onPress,
}: {
  total: number;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View
      className="absolute left-0 right-0 flex-row items-center gap-3 bg-surface px-5"
      style={{
        // ponytail: warna border hardcode abu muda, theme tak punya token lebih muda dari border.
        bottom: Math.max(insets.bottom, 8),
        borderTopWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor: "#F3F4F6",
        paddingTop: 12,
        paddingBottom: 12,
      }}
    >
      <View className="flex-1">
        <Text className="font-extrabold text-[17px] text-foreground">
          {formatRupiah(total)}
        </Text>
        <Pressable className="self-start active:opacity-70">
          <Text className="text-[13px] text-muted">{t("cart.viewDetail")}</Text>
        </Pressable>
      </View>
      <Button title={t("cart.checkout")} onPress={onPress} />
    </View>
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
    /* Fee breakdown styles */
    feeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    feeLabel: { color: colors.muted, fontSize: 14 },
    feeValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
    feeTotal: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 8,
      marginTop: 4,
    },
    feeLabelBold: { color: colors.text, fontSize: 15, fontWeight: "800" },
    feeValueBold: { color: colors.text, fontSize: 15, fontWeight: "800" },
    /* All-merchants styles */
    merchantName: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 16,
    },
  });

// Baris item keranjang: gambar kecil di kiri, nama (hitam, lebih besar) +
// harga satuan di kanannya; di ujung kanan harga total (harga × jumlah) di
// atas tombol jumlah. Tombol: lingkaran penuh berisi angka — diklik jadi
// pil − n + seperti counter di halaman detail UMKM.
function CartItemRow({
  item,
  merchantId,
  colors,
}: {
  item: { product: { id: number; name: string; image?: string | null; price: string | number; stock: number; product_type: string }; quantity: number };
  merchantId: number;
  colors: { border: string };
}) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const [expanded, setExpanded] = useState(false);
  const lineTotal = Number(item.product.price) * item.quantity;

  return (
    <Swipeable
      overshootRight={false}
      // Geser melewati ~50px lalu lepas → terkunci terbuka; geser kanan lagi
      // untuk menutupnya.
      rightThreshold={50}
      renderRightActions={(progress) => (
        // Mulai +90px (tersembunyi di ujung kanan layar), lalu bergeser ke 0
        // seiring tarikan — posisi akhirnya tepat di kanan harga & jumlah.
        <Animated.View
          style={{
            width: 90,
            height: "100%",
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [90, 0],
                }),
              },
            ],
          }}
        >
          <Pressable
            onPress={() => setQuantity(merchantId, item.product.id, 0)}
            className="h-full w-full items-center justify-center bg-danger active:opacity-80"
          >
            <AppIcon name="trash" size={22} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}
    >
      <View>
        <View className="flex-row items-start gap-3 py-3 px-5">
        <View className="h-[72px] w-[72px]">
          {item.product.image ? (
            <Image
              source={{ uri: item.product.image }}
              className="h-full w-full rounded-[10px]"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center rounded-[10px] bg-surface-muted">
              <Text className="text-[26px]">
                {item.product.product_type === "goods" ? "🛍️" : "🍜"}
              </Text>
            </View>
          )}
        </View>

        <View className="min-w-0 flex-1 self-center">
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            className="font-semibold text-[17px] leading-[22px] text-foreground"
          >
            {item.product.name}
          </Text>
        </View>

        {/* Harga × jumlah di atas tombol jumlah */}
        <View className="items-end gap-1.5 self-center">
          <Text className="font-bold text-[15px] text-foreground">
            {formatRupiah(lineTotal)}
          </Text>
          {expanded ? (
            <View className="flex-row items-center rounded-full border border-brand">
              <Pressable
                onPress={() => {
                  if (item.quantity <= 1) setExpanded(false);
                  setQuantity(merchantId, item.product.id, item.quantity - 1);
                }}
                className="h-7 w-7 items-center justify-center"
              >
                <Text className="font-bold text-base text-foreground">−</Text>
              </Pressable>
              <Text className="min-w-[14px] text-center font-bold text-sm text-foreground">
                {item.quantity}
              </Text>
              <Pressable
                disabled={item.quantity >= item.product.stock}
                onPress={() =>
                  setQuantity(merchantId, item.product.id, item.quantity + 1)
                }
                className="h-7 w-7 items-center justify-center"
              >
                <Text className="font-bold text-base text-foreground">+</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setExpanded(true)}
              className="h-8 w-8 items-center justify-center rounded-full border border-brand active:opacity-80"
            >
              <Text className="font-bold text-sm text-foreground">
                {item.quantity}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      {/* Garis pemisah sejajar konten, bukan full width */}
      <View
        className="h-px mx-5"
        style={{ backgroundColor: colors.border }}
      />
      </View>
    </Swipeable>
  );
}
