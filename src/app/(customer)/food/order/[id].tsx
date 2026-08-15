import { useMemo as useThemeMemo , useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PaymentSummary } from "@/components/payment-summary";
import { RatingCard } from "@/components/rating-card";
import { RideMap } from "@/components/ride-map";
import {
  Button,
  Card,
  FormField,
  KeyValue,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import { getFoodOrderDetail } from "@/lib/api/food";
import { cancelRide } from "@/lib/api/rides";
import { getApiErrorMessage } from "@/lib/api/client";
import { foodKeys } from "@/lib/food-query-keys";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { parseCoordinate } from "@/lib/location";
import { orderKeys } from "@/lib/query-keys";
import { useAppTheme } from "@/stores/theme-store";

const terminal = new Set(["completed", "cancelled"]);
export default function FoodOrderDetailScreen() {
  const { styles } = useScreenStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: foodKeys.order(orderId),
    queryFn: () => getFoodOrderDetail(orderId),
    enabled: Number.isInteger(orderId) && orderId > 0,
    refetchInterval: ({ state }) =>
      state.data && terminal.has(state.data.status) ? false : 5_000,
  });
  const cancel = useMutation({
    mutationFn: () => cancelRide(orderId, reason),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: foodKeys.order(orderId) }),
        client.invalidateQueries({ queryKey: orderKeys.all }),
      ]);
    },
  });
  return (
    <Screen>
      <Button
        title="Kembali"
        variant="secondary"
        onPress={() => router.back()}
      />
      <PageHeader
        eyebrow="Food Order"
        title={query.data?.order_number ?? "Detail pesanan"}
        description="Status diperbarui setiap 5 detik selama order aktif."
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
            <KeyValue
              label="Merchant"
              value={query.data.merchant?.name ?? "-"}
            />
            <KeyValue
              label="Subtotal"
              value={formatRupiah(query.data.subtotal)}
            />
            <KeyValue
              label="Delivery fee"
              value={formatRupiah(query.data.delivery_fee)}
            />
            <KeyValue
              label="Service fee"
              value={formatRupiah(query.data.service_fee)}
            />
            <KeyValue
              label="Total"
              value={formatRupiah(query.data.total_price)}
            />
          </Card>
          <PaymentSummary order={query.data} />
          <Card>
            <Text style={styles.heading}>Items</Text>
            {query.data.items?.map((item) => (
              <View key={item.id} style={styles.item}>
                <Text style={styles.title}>
                  {item.product_name} × {item.quantity}
                </Text>
                <KeyValue
                  label="Harga snapshot"
                  value={formatRupiah(item.price)}
                />
                <KeyValue
                  label="Subtotal"
                  value={formatRupiah(item.subtotal)}
                />
              </View>
            ))}
          </Card>
          <RideMap
            pickup={parseCoordinate(
              query.data.pickup_latitude,
              query.data.pickup_longitude,
            )}
            destination={parseCoordinate(
              query.data.destination_latitude,
              query.data.destination_longitude,
            )}
            driver={parseCoordinate(
              query.data.driver?.location?.latitude,
              query.data.driver?.location?.longitude,
            )}
            focus="all"
          />
          <Card>
            <Text style={styles.heading}>Pengantaran</Text>
            <KeyValue label="Pickup" value={query.data.pickup_address ?? "-"} />
            <KeyValue
              label="Tujuan"
              value={query.data.destination_address ?? "-"}
            />
            <KeyValue label="Catatan" value={query.data.notes || "-"} />
            {query.data.driver ? (
              <>
                <KeyValue label="Driver" value={query.data.driver.user.name} />
                <KeyValue
                  label="Kendaraan"
                  value={
                    query.data.driver.vehicle
                      ? `${query.data.driver.vehicle.brand} ${query.data.driver.vehicle.model} · ${query.data.driver.vehicle.plate_number}`
                      : "-"
                  }
                />
              </>
            ) : null}
          </Card>
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
          <RatingCard order={query.data} queryKey={foodKeys.order(orderId)} />
          {query.data.status === "pending" ? (
            <Card>
              <Text style={styles.heading}>Batalkan pesanan</Text>
              <FormField
                label="Alasan (opsional)"
                value={reason}
                onChangeText={setReason}
                maxLength={500}
              />
              {cancel.isError ? (
                <Text style={styles.error}>
                  {getApiErrorMessage(cancel.error)}
                </Text>
              ) : null}
              <Button
                title="Batalkan Food Order"
                variant="danger"
                loading={cancel.isPending}
                onPress={() => cancel.mutate()}
              />
            </Card>
          ) : null}
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
  heading: { color: colors.text, fontWeight: "800", fontSize: 18 },
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
