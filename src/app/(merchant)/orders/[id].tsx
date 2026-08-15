import { useMemo as useThemeMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { OrderStatusBadge } from "@/components/order-status-badge";
import {
  Button,
  Card,
  KeyValue,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import {
  confirmMerchantOrder,
  getFoodOrderDetail,
  updateMerchantOrderStatus,
} from "@/lib/api/food";
import { getApiErrorMessage } from "@/lib/api/client";
import { foodKeys } from "@/lib/food-query-keys";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useAppTheme } from "@/stores/theme-store";

const action = {
  pending: ["Terima Pesanan", "confirm"],
  merchant_confirmed: ["Mulai Siapkan", "preparing"],
  preparing: ["Siap Diambil", "ready_for_pickup"],
} as const;
export default function MerchantOrderDetailScreen() {
  const { styles } = useScreenStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: foodKeys.order(orderId),
    queryFn: () => getFoodOrderDetail(orderId),
    enabled: orderId > 0,
    refetchInterval: ({ state }) =>
      state.data && ["completed", "cancelled"].includes(state.data.status)
        ? false
        : 5_000,
  });
  const transition = useMutation({
    mutationFn: async (next: "confirm" | "preparing" | "ready_for_pickup") =>
      next === "confirm"
        ? confirmMerchantOrder(orderId)
        : updateMerchantOrderStatus(orderId, next),
    onSuccess: async (order) => {
      client.setQueryData(foodKeys.order(orderId), order);
      await client.invalidateQueries({ queryKey: foodKeys.merchantOrders });
    },
  });
  const currentAction = query.data
    ? action[query.data.status as keyof typeof action]
    : undefined;
  return (
    <Screen>
      <Button
        title="Kembali"
        variant="secondary"
        onPress={() => router.back()}
      />
      <PageHeader
        eyebrow="Merchant Order"
        title={query.data?.order_number ?? "Detail pesanan"}
      />
      {query.isLoading ? (
        <StatusState type="loading" />
      ) : query.isError ? (
        <StatusState
          type="error"
          message={getApiErrorMessage(query.error)}
          action={<Button title="Coba lagi" onPress={() => query.refetch()} />}
        />
      ) : query.data ? (
        <>
          <Card>
            <OrderStatusBadge status={query.data.status} />
            <KeyValue label="Customer" value={query.data.user?.name ?? "-"} />
            <KeyValue label="Telepon" value={query.data.user?.phone ?? "-"} />
            <KeyValue
              label="Total"
              value={formatRupiah(query.data.total_price)}
            />
            <KeyValue
              label="Pembayaran"
              value={`${query.data.payment_method} · ${query.data.payment_status}`}
            />
          </Card>
          <Card>
            <Text style={styles.heading}>Items</Text>
            {query.data.items?.map((item) => (
              <View key={item.id} style={styles.item}>
                <Text style={styles.title}>
                  {item.product_name} × {item.quantity}
                </Text>
                <KeyValue label="Harga" value={formatRupiah(item.price)} />
                <KeyValue
                  label="Subtotal"
                  value={formatRupiah(item.subtotal)}
                />
              </View>
            ))}
          </Card>
          <Card>
            <Text style={styles.heading}>Delivery</Text>
            <KeyValue
              label="Alamat"
              value={query.data.destination_address ?? "-"}
            />
            <KeyValue label="Catatan" value={query.data.notes || "-"} />
            {query.data.driver ? (
              <KeyValue label="Driver" value={query.data.driver.user.name} />
            ) : (
              <Text style={styles.muted}>Driver belum ditugaskan.</Text>
            )}
          </Card>
          {currentAction ? (
            <Card>
              <Text style={styles.muted}>
                Pastikan kondisi pesanan sesuai sebelum melanjutkan status.
              </Text>
              <Button
                title={currentAction[0]}
                loading={transition.isPending}
                onPress={() => transition.mutate(currentAction[1])}
              />
              {transition.isError ? (
                <Text style={styles.error}>
                  {getApiErrorMessage(transition.error)}
                </Text>
              ) : null}
            </Card>
          ) : null}
          <Card>
            <Text style={styles.heading}>Riwayat status</Text>
            {query.data.status_histories?.map((history) => (
              <View key={history.id} style={styles.item}>
                <OrderStatusBadge status={history.status} />
                <Text style={styles.muted}>
                  {formatDateTime(history.created_at)}
                </Text>
                {history.note ? (
                  <Text style={styles.muted}>{history.note}</Text>
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  heading: { color: colors.text, fontSize: 18, fontWeight: "800" },
  title: { color: colors.text, fontWeight: "700" },
  item: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  muted: { color: colors.muted, lineHeight: 20 },
  error: { color: Colors.danger },
});
