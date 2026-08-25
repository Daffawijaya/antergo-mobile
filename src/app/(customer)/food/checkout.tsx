import { useMemo as useThemeMemo, useState } from "react";
import { useTranslation } from "@/i18n";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert, StyleSheet, Text, View } from "react-native";
import { LocationField } from "@/components/location-field";
import {
  BackButton,
  Button,
  Card,
  FormField,
  KeyValue,
  Notice,
  PageHeader,
  Screen,
  SectionHeader,
  StatusState,
} from "@/components/ui";
import { Spacing, Typography } from "@/constants/colors";
import { createFoodOrder, payWithMidtrans } from "@/lib/api/food";
import { getApiErrorMessage } from "@/lib/api/client";
import { foodKeys } from "@/lib/food-query-keys";
import { formatRupiah } from "@/lib/format";
import { orderKeys } from "@/lib/query-keys";
import { useCartStore } from "@/stores/cart-store";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import { useAppTheme } from "@/stores/theme-store";

export default function FoodCheckoutScreen() {
  const { styles } = useScreenStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
  const { merchantId: merchantIdParam } = useLocalSearchParams<{
    merchantId?: string;
  }>();
  const merchantId = Number(merchantIdParam);

  const cart = useCartStore((s) => s.carts[merchantId]);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const merchant = cart?.merchant;
  const items = cart?.items ?? [];
  const clearMerchant = useCartStore((s) => s.clearMerchant);

  const destination = useLocationPickerStore(
    (s) => s.selections["food-destination"],
  );
  const [notes, setNotes] = useState("");
  const [validation, setValidation] = useState("");

  const service =
    items[0]?.product.product_type === "goods" ? "shopping" : "food";
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const mutation = useMutation({
    mutationFn: createFoodOrder,
    onSuccess: async ({ order }) => {
      if (paymentMethod === "midtrans") {
        try {
          const snapUrl = await payWithMidtrans(order.id);
          if (snapUrl) await WebBrowser.openBrowserAsync(snapUrl);
          else throw new Error("missing redirect_url");
        } catch {
          Alert.alert(
            "Pembayaran",
            "Gagal membuka halaman pembayaran. Coba bayar dari detail pesanan.",
          );
        }
      }
      clearMerchant(merchantId);
      await Promise.all([
        client.invalidateQueries({ queryKey: orderKeys.all }),
        client.invalidateQueries({ queryKey: foodKeys.merchants }),
      ]);
      router.replace({
        pathname: "/(customer)/food/order/[id]",
        params: { id: String(order.id) },
      });
    },
  });

  const submit = () => {
    if (!merchant || !items.length) return;
    if (!destination) {
      setValidation("Pilih alamat pengantaran terlebih dahulu.");
      return;
    }
    setValidation("");
    mutation.mutate({
      merchant_id: merchant.id,
      items: items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      destination_address: destination.address,
      destination_latitude: destination.coordinate.latitude,
      destination_longitude: destination.coordinate.longitude,
      payment_method: paymentMethod,
      notes: notes.trim() || null,
      service_type: service,
    });
  };

  if (!merchant || !items.length)
    return (
      <Screen>
        <StatusState
          type="empty"
          title="Keranjang kosong"
          message="Tambahkan menu sebelum melanjutkan checkout."
          action={
            <Button
              title="Cari makanan"
              onPress={() => router.replace("/(customer)/food")}
            />
          }
        />
      </Screen>
    );

  return (
    <Screen>
      <PageHeader
        eyebrow={service === "shopping" ? "BELANJA" : "MAKANAN"}
        title="Konfirmasi pesanan"
        description="Periksa alamat dan ringkasan sebelum memesan."
        action={<BackButton onPress={() => router.back()} />}
      />
      <View style={styles.section}>
        <SectionHeader title="Alamat pengantaran" />
        <LocationField
          label="Kirim ke"
          value={destination?.address}
          placeholder="Pilih alamat pengantaran"
          onPress={() =>
            router.push({
              pathname: "/(customer)/location-search",
              params: {
                purpose: "food-destination",
                returnTo: `/(customer)/food/checkout?service=${service}&merchantId=${merchantId}`,
              },
            })
          }
        />
      </View>
      {validation ? <Notice tone="danger">{validation}</Notice> : null}
      <View style={styles.section}>
        <SectionHeader title="Pesanan" />
        <Card muted>
          <Text style={styles.merchant}>{merchant.name}</Text>
          {items.map((item) => (
            <View key={item.product.id} style={styles.item}>
              <Text numberOfLines={1} style={styles.itemName}>
                {item.quantity}× {item.product.name}
              </Text>
              <Text style={styles.itemPrice}>
                {formatRupiah(Number(item.product.price) * item.quantity)}
              </Text>
            </View>
          ))}
        </Card>
      </View>
      <Card>
        <KeyValue label={`${itemCount} item`} value={formatRupiah(subtotal)} />
        <KeyValue
          label="Pembayaran"
          value={paymentMethod === "midtrans" ? "Midtrans" : "Tunai"}
        />
        <View style={styles.divider} />
        <KeyValue label="Total sementara" value={formatRupiah(subtotal)} />
      </Card>
      <FormField
        label={t("jastip.driverNote")}
        placeholder="Contoh: jangan terlalu pedas"
        value={notes}
        onChangeText={setNotes}
        maxLength={500}
        multiline
      />
      {mutation.isError ? (
        <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
      ) : null}
      <Text style={styles.helper}>
        Ongkir dan total final dihitung otomatis oleh server.
      </Text>
      <Button
        title="Pesan sekarang"
        loading={mutation.isPending}
        onPress={submit}
      />
    </Screen>
  );
}

function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    section: { gap: Spacing.md },
    merchant: { color: colors.text, ...Typography.cardTitle },
    item: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: Spacing.md,
    },
    itemName: { flex: 1, color: colors.muted, ...Typography.body },
    itemPrice: { color: colors.text, ...Typography.metadata, fontWeight: "700" },
    divider: { height: 1, backgroundColor: colors.border },
    helper: { color: colors.muted, ...Typography.metadata, textAlign: "center" },
  });
