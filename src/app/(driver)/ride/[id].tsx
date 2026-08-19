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
      state.data && TERMINAL.has(state.data.status) ? false : 10_000,
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
  const order = detail.data;

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
              onPress={() => router.replace("/(driver)/orders")}
            />
          }
        />
      </Screen>
    );

  return (
    <Screen>
      <BackButton
        onPress={() => router.replace("/(driver)/orders")}
        title={order?.order_number ?? "Detail Perjalanan"}
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
      ) : order ? (
        <>
          {/* ── Status & Pendapatan ── */}
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

            {order.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Catatan</Text>
                <Text style={styles.notesText}>{order.notes}</Text>
              </View>
            ) : null}
          </Card>

          {/* ── Customer ── */}
          <Card>
            <Text style={styles.sectionTitle}>Pelanggan</Text>
            <KeyValue label="Nama" value={order.user?.name ?? "—"} />
            {order.user?.phone ? (
              <KeyValue label="Telepon" value={order.user.phone} />
            ) : null}
            {/* Chat button */}
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
            focus={
              order.status === "in_progress" || order.status === "completed"
                ? "destination"
                : "pickup"
            }
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

          {/* ── Cancelled ── */}
          {order.status === "cancelled" ? (
            <StatusState
              type="error"
              title="Ride dibatalkan"
              message={
                order.cancelled_reason ||
                "Perjalanan ini tidak dapat dilanjutkan."
              }
            />
          ) : null}

          {/* ── Primary CTA ── */}
          {next ? (
            <Card>
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

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    /* Hero */
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

    /* Route */
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
    notesBox: {
      marginTop: 10,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
    },
    notesLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 2,
    },
    notesText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },

    /* Chat */
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

    /* Section */
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 6,
    },

    /* History */
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

    /* Price highlight */
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
