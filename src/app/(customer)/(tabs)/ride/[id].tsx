import { useMemo as useThemeMemo , useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { OrderStatusBadge } from "@/components/order-status-badge";
import { PaymentSummary } from "@/components/payment-summary";
import { RatingCard } from "@/components/rating-card";
import { RideMap } from "../../../../components/ride-map";
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
import { cancelRide, getOrderDetail } from "@/lib/api/rides";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { parseCoordinate } from "@/lib/location";
import { orderKeys } from "@/lib/query-keys";
import { useAppTheme } from "@/stores/theme-store";

const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);
const CANCELLABLE_STATUSES = new Set(["searching_driver", "driver_assigned"]);

export default function RideDetailScreen() {
  const { styles } = useScreenStyles();
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = Number(params.id);
  const [reason, setReason] = useState("");
  const validId = Number.isInteger(orderId) && orderId > 0;
  const query = useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => getOrderDetail(orderId),
    enabled: validId,
    refetchInterval: ({ state }) => {
      const order = state.data;
      return order && TERMINAL_STATUSES.has(order.status) ? false : 5_000;
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelRide(orderId, reason),
    onSuccess: async () => {
      setReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      ]);
    },
  });

  if (!validId)
    return (
      <Screen>
        <StatusState
          type="error"
          message="ID order tidak valid."
          action={
            <Button
              title="Kembali"
              variant="secondary"
              onPress={() => router.back()}
            />
          }
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
        eyebrow="Detail Perjalanan"
        title={query.data?.order_number ?? "Detail perjalanan"}
        description="Status diperbarui otomatis selama perjalanan aktif."
      />
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
          <Card>
            <OrderStatusBadge status={query.data.status} />
            <KeyValue label="Nomor order" value={query.data.order_number} />
            <KeyValue
              label="Jarak"
              value={query.data.distance ? `${query.data.distance} km` : "-"}
            />
            <KeyValue
              label="Total"
              value={formatRupiah(query.data.total_price)}
            />
          </Card>
          <PaymentSummary order={query.data} />
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
            <Text style={styles.sectionTitle}>Rute</Text>
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>Jemput</Text>
              <Text style={styles.routeText}>
                {query.data.pickup_address ?? "-"}
              </Text>
            </View>
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>Tujuan</Text>
              <Text style={styles.routeText}>
                {query.data.destination_address ?? "-"}
              </Text>
            </View>
            <KeyValue label="Catatan" value={query.data.notes || "-"} />
          </Card>
          {query.data.driver ? (
            <Card>
              <Text style={styles.sectionTitle}>Driver</Text>
              <KeyValue label="Nama" value={query.data.driver.user.name} />
              <KeyValue label="Telepon" value={query.data.driver.user.phone} />
              <KeyValue label="Rating" value={query.data.driver.rating} />
              {(query.data.vehicle_snapshot ?? query.data.driver.vehicle) ? (
                <>
                  <KeyValue
                    label="Kendaraan"
                    value={`${(query.data.vehicle_snapshot ?? query.data.driver.vehicle)!.brand} ${(query.data.vehicle_snapshot ?? query.data.driver.vehicle)!.model}`}
                  />
                  <KeyValue
                    label="Plat nomor"
                    value={(query.data.vehicle_snapshot ?? query.data.driver.vehicle)!.plate_number}
                  />
                  <KeyValue
                    label="Warna"
                    value={(query.data.vehicle_snapshot ?? query.data.driver.vehicle)!.color}
                  />
                </>
              ) : (
                <Text style={styles.muted}>Data kendaraan belum tersedia.</Text>
              )}
            </Card>
          ) : query.data.status === "searching_driver" ? (
            <Card>
              <Text style={styles.muted}>Sedang mencari driver terdekat.</Text>
            </Card>
          ) : null}
          <Card>
            <Text style={styles.sectionTitle}>Riwayat status</Text>
            {!query.data.status_histories?.length ? (
              <Text style={styles.muted}>Belum ada riwayat status.</Text>
            ) : (
              query.data.status_histories.map((history) => (
                <View key={history.id} style={styles.history}>
                  <OrderStatusBadge status={history.status} />
                  <Text style={styles.historyDate}>
                    {formatDateTime(history.created_at)}
                  </Text>
                  {history.note ? (
                    <Text style={styles.muted}>{history.note}</Text>
                  ) : null}
                </View>
              ))
            )}
          </Card>
          <RatingCard order={query.data} queryKey={orderKeys.detail(orderId)} />
          {CANCELLABLE_STATUSES.has(query.data.status) ? (
            <Card>
              <Text style={styles.sectionTitle}>Batalkan perjalanan</Text>
              <FormField
                label="Alasan (opsional)"
                placeholder="Maksimal 500 karakter"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={500}
                value={reason}
                onChangeText={setReason}
              />
              {cancelMutation.isError ? (
                <Text style={styles.error}>
                  {getApiErrorMessage(cancelMutation.error)}
                </Text>
              ) : null}
              <Button
                title="Batalkan Perjalanan"
                variant="danger"
                loading={cancelMutation.isPending}
                onPress={() => cancelMutation.mutate()}
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

function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  routeItem: { gap: 3 },
  routeLabel: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  routeText: { color: colors.text, lineHeight: 21 },
  muted: { color: colors.muted, lineHeight: 20 },
  history: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyDate: { color: colors.muted, fontSize: 12 },
  error: { color: Colors.danger, lineHeight: 20 },
});
