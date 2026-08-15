import { useMemo as useThemeMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { OrderStatusBadge } from "@/components/order-status-badge";
import { PaymentSummary } from "@/components/payment-summary";
import { RideMap } from "../../../components/ride-map";
import {
  Button,
  Card,
  KeyValue,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import { getDriverRideDetail, updateRideStatus } from "@/lib/api/driver-rides";
import { getApiErrorMessage } from "@/lib/api/client";
import { settleCashPayment } from "@/lib/api/payment-rating";
import { driverKeys } from "@/lib/driver-query-keys";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { parseCoordinate } from "@/lib/location";
import type { DriverRideStatusUpdate, OrderStatus } from "@/types/api";
import { useAppTheme } from "@/stores/theme-store";

const TERMINAL = new Set<OrderStatus>(["completed", "cancelled"]);
const TRANSITIONS: Partial<
  Record<OrderStatus, { status: DriverRideStatusUpdate; label: string }>
> = {
  driver_assigned: {
    status: "driver_arrived",
    label: "Sudah Sampai Lokasi Jemput",
  },
  driver_arrived: { status: "in_progress", label: "Mulai Perjalanan" },
  in_progress: { status: "completed", label: "Selesaikan Perjalanan" },
};

export default function DriverRideDetailScreen() {
  const { styles } = useScreenStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const validId = Number.isInteger(orderId) && orderId > 0;
  const router = useRouter();
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: driverKeys.detail(orderId),
    queryFn: () => getDriverRideDetail(orderId),
    enabled: validId,
    refetchInterval: ({ state }) =>
      state.data && TERMINAL.has(state.data.status) ? false : 5_000,
  });
  const transition = useMutation({
    mutationFn: ({ status }: { status: DriverRideStatusUpdate }) =>
      updateRideStatus(orderId, status),
    onSuccess: async (order) => {
      client.setQueryData(driverKeys.detail(orderId), order);
      await Promise.all([
        client.invalidateQueries({ queryKey: driverKeys.active }),
        client.invalidateQueries({ queryKey: driverKeys.profile }),
        client.invalidateQueries({ queryKey: ["driver", "rides", "history"] }),
        client.invalidateQueries({ queryKey: driverKeys.available }),
      ]);
    },
  });
  const settle = useMutation({
    mutationFn: () => settleCashPayment(orderId),
    onSuccess: async (order) => {
      client.setQueryData(driverKeys.detail(orderId), order);
      await Promise.all([
        client.invalidateQueries({ queryKey: driverKeys.detail(orderId) }),
        client.invalidateQueries({ queryKey: ["driver", "rides", "history"] }),
      ]);
    },
  });
  const next = detail.data ? TRANSITIONS[detail.data.status] : undefined;

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
        eyebrow="Driver Ride"
        title={detail.data?.order_number ?? "Detail Ride"}
        description="Status customer dan driver disinkronkan melalui Laravel API."
      />
      {detail.isLoading ? (
        <StatusState type="loading" />
      ) : detail.isError ? (
        <StatusState
          type="error"
          message={getApiErrorMessage(detail.error)}
          action={
            <Button
              title="Coba lagi"
              variant="secondary"
              onPress={() => detail.refetch()}
            />
          }
        />
      ) : detail.data ? (
        <>
          <Card>
            <OrderStatusBadge status={detail.data.status} />
            <KeyValue label="Nomor order" value={detail.data.order_number} />
            <KeyValue
              label="Jarak"
              value={detail.data.distance ? `${detail.data.distance} km` : "-"}
            />
            <KeyValue
              label="Total perjalanan"
              value={formatRupiah(detail.data.total_price)}
            />
          </Card>
          <PaymentSummary order={detail.data} />
          <Card>
            <Text style={styles.sectionTitle}>Customer</Text>
            <KeyValue label="Nama" value={detail.data.user?.name ?? "-"} />
            <KeyValue label="Telepon" value={detail.data.user?.phone ?? "-"} />
          </Card>
          <RideMap
            pickup={parseCoordinate(
              detail.data.pickup_latitude,
              detail.data.pickup_longitude,
            )}
            destination={parseCoordinate(
              detail.data.destination_latitude,
              detail.data.destination_longitude,
            )}
            driver={parseCoordinate(
              detail.data.driver?.location?.latitude,
              detail.data.driver?.location?.longitude,
            )}
            focus={
              detail.data.status === "in_progress" ||
              detail.data.status === "completed"
                ? "destination"
                : "pickup"
            }
          />
          <Card>
            <Text style={styles.sectionTitle}>Rute</Text>
            <View style={styles.route}>
              <Text style={styles.routeLabel}>Jemput</Text>
              <Text style={styles.body}>
                {detail.data.pickup_address ?? "-"}
              </Text>
            </View>
            <View style={styles.route}>
              <Text style={styles.routeLabel}>Tujuan</Text>
              <Text style={styles.body}>
                {detail.data.destination_address ?? "-"}
              </Text>
            </View>
            <KeyValue label="Catatan" value={detail.data.notes || "-"} />
          </Card>
          {detail.data.driver?.vehicle ? (
            <Card>
              <Text style={styles.sectionTitle}>Kendaraan</Text>
              <KeyValue
                label="Kendaraan"
                value={`${detail.data.driver.vehicle.brand} ${detail.data.driver.vehicle.model}`}
              />
              <KeyValue
                label="Plat nomor"
                value={detail.data.driver.vehicle.plate_number}
              />
              <KeyValue
                label="Warna"
                value={detail.data.driver.vehicle.color}
              />
            </Card>
          ) : null}
          <Card>
            <Text style={styles.sectionTitle}>Riwayat status</Text>
            {!detail.data.status_histories?.length ? (
              <Text style={styles.muted}>Belum ada riwayat status.</Text>
            ) : (
              detail.data.status_histories.map((history) => (
                <View key={history.id} style={styles.history}>
                  <OrderStatusBadge status={history.status} />
                  <Text style={styles.date}>
                    {formatDateTime(history.created_at)}
                  </Text>
                  {history.note ? (
                    <Text style={styles.body}>{history.note}</Text>
                  ) : null}
                </View>
              ))
            )}
          </Card>
          {detail.data.status === "cancelled" ? (
            <StatusState
              type="error"
              title="Ride dibatalkan customer"
              message={
                detail.data.cancelled_reason ||
                "Perjalanan ini tidak dapat dilanjutkan."
              }
            />
          ) : detail.data.status === "completed" ? (
            <Card>
              <Text style={styles.sectionTitle}>Ride selesai</Text>
              {detail.data.payment_status === "paid" ? (
                <>
                  <Text style={styles.body}>
                    Pembayaran tunai sudah diterima.
                  </Text>
                  <Button
                    title="Kembali ke Order"
                    onPress={() => router.replace("/(driver)/orders")}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.body}>
                    Total diterima: {formatRupiah(detail.data.total_price)}
                  </Text>
                  {settle.isError ? (
                    <Text style={styles.error}>
                      {getApiErrorMessage(settle.error)}
                    </Text>
                  ) : null}
                  <Button
                    title="Pembayaran Tunai Diterima"
                    loading={settle.isPending}
                    onPress={() => settle.mutate()}
                  />
                </>
              )}
            </Card>
          ) : next ? (
            <Card>
              <Text style={styles.sectionTitle}>Aksi perjalanan</Text>
              {transition.isError ? (
                <Text style={styles.error}>
                  {getApiErrorMessage(transition.error)}
                </Text>
              ) : null}
              <Button
                title={next.label}
                loading={transition.isPending}
                onPress={() => transition.mutate({ status: next.status })}
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
  route: { gap: 3 },
  routeLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  body: { color: colors.text, lineHeight: 21 },
  muted: { color: colors.muted, lineHeight: 20 },
  history: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  date: { color: colors.muted, fontSize: 12 },
  error: { color: Colors.danger, lineHeight: 20 },
});
