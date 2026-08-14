import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
import { getApiErrorMessage } from "@/lib/api/client";
import { cancelRide } from "@/lib/api/rides";
import { getSendDetail } from "@/lib/api/send";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { parseCoordinate } from "@/lib/location";
import { orderKeys } from "@/lib/query-keys";
import { sendKeys } from "@/lib/send-query-keys";

const terminal = new Set(["completed", "cancelled"]);
const cancellable = new Set(["searching_driver", "driver_assigned"]);
export default function CustomerSendDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: sendKeys.detail(orderId),
    queryFn: () => getSendDetail(orderId),
    enabled: orderId > 0,
    refetchInterval: ({ state }) =>
      state.data && terminal.has(state.data.status) ? false : 5_000,
  });
  const cancel = useMutation({
    mutationFn: () => cancelRide(orderId, reason),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: sendKeys.detail(orderId) }),
        client.invalidateQueries({ queryKey: orderKeys.all }),
      ]);
    },
  });
  const order = query.data;
  if (order && order.type !== "send")
    return (
      <Screen>
        <StatusState
          type="error"
          message="Order ini bukan pengiriman barang."
        />
      </Screen>
    );
  return (
    <Screen>
      <Button
        title="Kembali"
        variant="secondary"
        onPress={() => router.back()}
      />
      <PageHeader
        eyebrow="Delivery Detail"
        title={order?.order_number ?? "Detail pengiriman"}
        description="Status diperbarui otomatis setiap 5 detik selama pengiriman aktif."
      />
      {query.isLoading ? (
        <StatusState type="loading" />
      ) : query.isError ? (
        <StatusState
          type="error"
          message={getApiErrorMessage(query.error)}
          action={<Button title="Coba lagi" onPress={() => query.refetch()} />}
        />
      ) : order ? (
        <>
          <Card>
            <OrderStatusBadge status={order.status} />
            <KeyValue label="Nomor order" value={order.order_number} />
            <KeyValue
              label="Jarak"
              value={order.distance ? `${order.distance} km` : "-"}
            />
            <KeyValue label="Total" value={formatRupiah(order.total_price)} />
          </Card>
          <PaymentSummary order={order} />
          <RideMap
            pickup={parseCoordinate(
              order.pickup_latitude,
              order.pickup_longitude,
            )}
            destination={parseCoordinate(
              order.destination_latitude,
              order.destination_longitude,
            )}
            driver={parseCoordinate(
              order.driver?.location?.latitude,
              order.driver?.location?.longitude,
            )}
            focus="all"
          />
          <Card>
            <Text style={styles.title}>Barang dan penerima</Text>
            <KeyValue
              label="Barang"
              value={order.send_details?.item_name ?? "-"}
            />
            <KeyValue
              label="Deskripsi"
              value={order.send_details?.item_description || "-"}
            />
            <KeyValue
              label="Penerima"
              value={order.send_details?.recipient_name ?? "-"}
            />
            <KeyValue
              label="Telepon"
              value={order.send_details?.recipient_phone ?? "-"}
            />
            <KeyValue label="Catatan" value={order.notes || "-"} />
          </Card>
          <Card>
            <Text style={styles.title}>Rute</Text>
            <KeyValue label="Pickup" value={order.pickup_address ?? "-"} />
            <KeyValue label="Tujuan" value={order.destination_address ?? "-"} />
          </Card>
          {order.driver ? (
            <Card>
              <Text style={styles.title}>Driver</Text>
              <KeyValue label="Nama" value={order.driver.user.name} />
              <KeyValue label="Telepon" value={order.driver.user.phone} />
              <KeyValue label="Rating" value={order.driver.rating} />
              {order.driver.vehicle ? (
                <>
                  <KeyValue
                    label="Kendaraan"
                    value={`${order.driver.vehicle.brand} ${order.driver.vehicle.model}`}
                  />
                  <KeyValue
                    label="Plat"
                    value={order.driver.vehicle.plate_number}
                  />
                </>
              ) : null}
            </Card>
          ) : null}
          <Card>
            <Text style={styles.title}>Riwayat status</Text>
            {!order.status_histories?.length ? (
              <Text style={styles.muted}>Belum ada riwayat.</Text>
            ) : (
              order.status_histories.map((history) => (
                <View key={history.id} style={styles.history}>
                  <OrderStatusBadge status={history.status} />
                  <Text style={styles.muted}>
                    {formatDateTime(history.created_at)}
                  </Text>
                  {history.note ? (
                    <Text style={styles.muted}>{history.note}</Text>
                  ) : null}
                </View>
              ))
            )}
          </Card>
          <RatingCard order={order} queryKey={sendKeys.detail(orderId)} />
          {cancellable.has(order.status) ? (
            <Card>
              <Text style={styles.title}>Batalkan pengiriman</Text>
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
                title="Batalkan Delivery"
                variant="danger"
                loading={cancel.isPending}
                onPress={() => cancel.mutate()}
              />
            </Card>
          ) : null}
        </>
      ) : (
        <StatusState type="empty" />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { color: Colors.text, fontSize: 18, fontWeight: "800" },
  muted: { color: Colors.muted, lineHeight: 20 },
  history: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  error: { color: Colors.danger },
});
