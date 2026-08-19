import { useMemo as useThemeMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PaymentSummary } from "@/components/payment-summary";
import { RideMap } from "../../../components/ride-map";
import {
  BackButton,
  Button,
  Card,
  KeyValue,
  Screen,
  StatusState,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { getDriverRideDetail } from "@/lib/api/driver-rides";
import { settleCashPayment } from "@/lib/api/payment-rating";
import { updateSendStatus } from "@/lib/api/send";
import { driverKeys } from "@/lib/driver-query-keys";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { parseCoordinate } from "@/lib/location";
import type { DriverSendStatusUpdate, OrderStatus } from "@/types/api";
import { useAppTheme } from "@/stores/theme-store";

const actions: Partial<
  Record<OrderStatus, { title: string; status: DriverSendStatusUpdate }>
> = {
  driver_assigned: {
    title: "Sudah Sampai Lokasi Pickup",
    status: "driver_arrived",
  },
  driver_arrived: { title: "Barang Sudah Diambil", status: "picked_up" },
  picked_up: { title: "Mulai Antar", status: "delivering" },
  delivering: { title: "Barang Sudah Diterima", status: "completed" },
};

export default function DriverSendDetail() {
  const { styles } = useScreenStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();
  const client = useQueryClient();
  const key = ["driver", "send", "detail", orderId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => getDriverRideDetail(orderId),
    enabled: orderId > 0,
    refetchInterval: ({ state }) =>
      state.data && ["completed", "cancelled"].includes(state.data.status)
        ? false
        : 5_000,
  });

  const invalidate = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: driverKeys.active }),
      client.invalidateQueries({ queryKey: driverKeys.available }),
      client.invalidateQueries({ queryKey: ["driver", "rides", "history"] }),
    ]);

  const transition = useMutation({
    mutationFn: (status: DriverSendStatusUpdate) =>
      updateSendStatus(orderId, status),
    onSuccess: async (order) => {
      client.setQueryData(key, order);
      await invalidate();
    },
  });

  const settle = useMutation({
    mutationFn: () => settleCashPayment(orderId),
    onSuccess: async (order) => {
      client.setQueryData(key, order);
      await Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: ["driver", "rides", "history"] }),
      ]);
    },
  });

  const order = query.data;
  const action = order ? actions[order.status] : undefined;

  if (order && order.type !== "send")
    return (
      <Screen>
        <StatusState type="error"        message="Order ini bukan pengiriman." />
      </Screen>
    );

  const focus =
    order && ["picked_up", "delivering", "completed"].includes(order.status)
      ? "destination"
      : "pickup";

  return (
    <Screen>
      <BackButton
        onPress={() => router.replace("/(driver)/orders")}
        title={order?.order_number ?? "Kirim barang"}
      />

      {query.isLoading ? (
        <StatusState type="loading" />
      ) : query.isError ? (
        <StatusState
          type="error"
          message={getApiErrorMessage(query.error)}
          action={
            <Button title="Coba lagi" onPress={() => query.refetch()} />
          }
        />
      ) : order ? (
        <>
          {/* ── Status & Harga ── */}
          <Card>
            <View style={styles.heroRow}>
              <OrderStatusBadge status={order.status} />
              <Text style={styles.heroPrice}>
                {formatRupiah(order.total_price)}
              </Text>
            </View>

            {/* Pickup → Destination */}
            <View style={styles.routeSection}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, styles.pickupDot]} />
                <View style={styles.routeCopy}>
                  <Text style={styles.routeLabel}>Jemput</Text>
                  <Text style={styles.routeAddress} numberOfLines={2}>
                    {order.pickup_address ?? "—"}
                  </Text>
                </View>
              </View>

              <View style={styles.routeArrowLine}>
                <View style={styles.routeLine} />                  <AppIcon name="down" size={14} color={Colors.primaryDark} />
                <View style={styles.routeLine} />
              </View>

              <View style={styles.routeRow}>
                <View style={[styles.routeDot, styles.destDot]} />
                <View style={styles.routeCopy}>
                  <Text style={styles.routeLabel}>Tujuan</Text>
                  <Text style={styles.routeAddress} numberOfLines={2}>
                    {order.destination_address ?? "—"}
                  </Text>
                </View>
              </View>
            </View>

            {order.distance ? (
              <Text style={styles.distance}>{order.distance} km</Text>
            ) : null}
          </Card>

          {/* ── Item & Penerima ── */}
          <Card>
            <Text style={styles.sectionTitle}>Barang & Penerima</Text>
            <KeyValue
              label="Barang"
              value={order.send_details?.item_name ?? "—"}
            />
            {order.send_details?.item_description ? (
              <KeyValue
                label="Deskripsi"
                value={order.send_details.item_description}
              />
            ) : null}
            <KeyValue
              label="Penerima"
              value={order.send_details?.recipient_name ?? "—"}
            />
            <KeyValue
              label="Telepon Penerima"
              value={order.send_details?.recipient_phone ?? "—"}
            />
            {order.notes ? (
              <KeyValue label="Catatan" value={order.notes} />
            ) : null}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(driver)/chat/[id]",
                  params: { id: String(order.id) },
                })
              }
              style={({ pressed }) => [
                styles.chatButton,
                pressed && styles.pressed,
              ]}
            >
              <AppIcon name="chat" size={18} color={Colors.primaryDark} />
              <Text style={styles.chatButtonText}>Chat Pelanggan</Text>
            </Pressable>
          </Card>

          {/* ── Payment ── */}
          <PaymentSummary order={order} />

          {/* ── Map ── */}
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
            focus={focus}
          />

          {/* ── Status History ── */}
          {order.status_histories?.length ? (
            <Card>
              <Text style={styles.sectionTitle}>Riwayat Status</Text>
              {order.status_histories.map((history) => (
                <View key={history.id} style={styles.historyItem}>
                  <OrderStatusBadge status={history.status} />
                  <Text style={styles.historyDate}>
                    {formatDateTime(history.created_at)}
                  </Text>
                  {history.note ? (
                    <Text style={styles.historyNote}>{history.note}</Text>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          {/* ── Cash Settlement ── */}
          {order.status === "completed" ? (
            <Card>
              <Text style={styles.sectionTitle}>Pembayaran Tunai</Text>
              {order.payment_status === "paid" ? (
                <>
                  <Text style={styles.muted}>Pembayaran sudah diterima.</Text>
                  <Button
                    title="Kembali ke Pesanan"
                    onPress={() => router.replace("/(driver)/orders")}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.priceHighlight}>
                    Total diterima: {formatRupiah(order.total_price)}
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
          ) : null}

          {/* ── Primary CTA ── */}
          {action ? (
            <Card>
              <Text style={styles.muted}>
                Pastikan tahap pengiriman sudah benar sebelum memperbarui
                status.
              </Text>
              {transition.isError ? (
                <Text style={styles.error}>
                  {getApiErrorMessage(transition.error)}
                </Text>
              ) : null}
              <Button
                title={action.title}
                loading={transition.isPending}
                onPress={() => transition.mutate(action.status)}
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

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    heroRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    heroPrice: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "800",
    },
    routeSection: {
      gap: 4,
    },
    routeRow: {
      flexDirection: "row",
      gap: 10,
    },
    routeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 4,
    },
    pickupDot: {
      backgroundColor: Colors.primary,
    },
    destDot: {
      backgroundColor: Colors.danger,
    },
    routeCopy: {
      flex: 1,
      gap: 2,
    },
    routeLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    routeAddress: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
      lineHeight: 20,
    },
    routeArrowLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 2,
      marginLeft: 15,
    },
    routeLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    distance: {
      color: colors.muted,
      fontSize: 13,
      marginTop: 8,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 6,
    },
    chatButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Colors.primary,
      backgroundColor: Colors.primarySoft,
    },
    chatButtonText: {
      color: Colors.primaryDark,
      fontSize: 14,
      fontWeight: "700",
    },
    historyItem: {
      gap: 4,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    historyDate: {
      color: colors.muted,
      fontSize: 12,
    },
    historyNote: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    priceHighlight: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    muted: {
      color: colors.muted,
      lineHeight: 20,
    },
    error: {
      color: Colors.danger,
      lineHeight: 20,
    },
    pressed: {
      opacity: 0.72,
    },
  });
