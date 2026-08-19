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
import {
  getDriverRideDetail,
  updateFoodDeliveryStatus,
} from "@/lib/api/driver-rides";
import { getApiErrorMessage } from "@/lib/api/client";
import { settleCashPayment } from "@/lib/api/payment-rating";
import { driverKeys } from "@/lib/driver-query-keys";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { parseCoordinate } from "@/lib/location";
import type { DriverFoodStatusUpdate, OrderStatus } from "@/types/api";
import { useAppTheme } from "@/stores/theme-store";

const actions: Partial<
  Record<OrderStatus, { title: string; status: DriverFoodStatusUpdate }>
> = {
  driver_assigned: { title: "Pesanan Sudah Diambil", status: "picked_up" },
  picked_up: { title: "Mulai Antar", status: "delivering" },
  delivering: { title: "Pesanan Terkirim", status: "completed" },
};

export default function DriverFoodDetailScreen() {
  const { styles } = useScreenStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const router = useRouter();
  const client = useQueryClient();

  const query = useQuery({
    queryKey: ["driver", "food", "detail", orderId],
    queryFn: () => getDriverRideDetail(orderId),
    enabled: orderId > 0,
    refetchInterval: ({ state }) =>
      state.data && ["completed", "cancelled"].includes(state.data.status)
        ? false
        : 5_000,
  });

  const transition = useMutation({
    mutationFn: (status: DriverFoodStatusUpdate) =>
      updateFoodDeliveryStatus(orderId, status),
    onSuccess: async (order) => {
      client.setQueryData(["driver", "food", "detail", orderId], order);
      await Promise.all([
        client.invalidateQueries({ queryKey: driverKeys.active }),
        client.invalidateQueries({ queryKey: driverKeys.available }),
        client.invalidateQueries({ queryKey: ["driver", "rides", "history"] }),
      ]);
    },
  });

  const settle = useMutation({
    mutationFn: () => settleCashPayment(orderId),
    onSuccess: async (updated) => {
      client.setQueryData(["driver", "food", "detail", orderId], updated);
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["driver", "food", "detail", orderId],
        }),
        client.invalidateQueries({ queryKey: ["driver", "rides", "history"] }),
      ]);
    },
  });

  const order = query.data;
  const action = order ? actions[order.status] : undefined;

  if (order && order.type !== "food")
    return (
      <Screen>
        <StatusState
          type="error"
          message="Order ini bukan pengantaran makanan."
          action={
            <Button
              title="Kembali"
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
        title={order?.order_number ?? "Pengantaran Makanan"}
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

            {/* Merchant → Customer */}
            <View style={styles.routeSection}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, styles.pickupDot]} />
                <View style={styles.routeCopy}>
                  <Text style={styles.routeLabel}>Merchant</Text>
                  <Text style={styles.routeAddress} numberOfLines={1}>
                    {order.merchant?.name ?? "—"}
                  </Text>
                  <Text style={styles.routeSub} numberOfLines={1}>
                    {order.pickup_address ?? order.merchant?.address ?? "—"}
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
                  <Text style={styles.routeLabel}>Pelanggan</Text>
                  <Text style={styles.routeAddress} numberOfLines={1}>
                    {order.user?.name ?? "—"}
                  </Text>
                  <Text style={styles.routeSub} numberOfLines={1}>
                    {order.destination_address ?? "—"}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* ── Items ── */}
          {order.items?.length ? (
            <Card>
              <Text style={styles.sectionTitle}>Pesanan</Text>
              {order.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {item.quantity}× {item.product_name}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {formatRupiah(item.subtotal)}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {/* ── Customer ── */}
          <Card>
            <Text style={styles.sectionTitle}>Pelanggan</Text>
            <KeyValue label="Nama" value={order.user?.name ?? "—"} />
            {order.user?.phone ? (
              <KeyValue label="Telepon" value={order.user.phone} />
            ) : null}
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
            focus="all"
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
                Pastikan tahap pengantaran sudah benar sebelum memperbarui
                status.
              </Text>
              <Button
                title={action.title}
                loading={transition.isPending}
                onPress={() => transition.mutate(action.status)}
              />
              {transition.isError ? (
                <Text style={styles.error}>
                  {getApiErrorMessage(transition.error)}
                </Text>
              ) : null}
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
    routeSub: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
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
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 6,
    },
    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    itemName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
    },
    itemPrice: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
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
