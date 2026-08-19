import { useMemo as useThemeMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { OrderStatusBadge } from "@/components/order-status-badge";
import {
  orderService,
  serviceLabel,
  ServiceLabel,
} from "@/components/service-icon";
import { Button, PageHeader, Screen, StatusState } from "@/components/ui";
import { Colors, Radius, Spacing, Typography } from "@/constants/colors";
import {
  acceptRide,
  getActiveRide,
  getDriverProfile,
  listAvailableRides,
  listDriverRideHistory,
} from "@/lib/api/driver-rides";
import { getApiErrorMessage } from "@/lib/api/client";
import { driverKeys } from "@/lib/driver-query-keys";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type { Order } from "@/types/api";
import { useAppTheme } from "@/stores/theme-store";

type Segment = "available" | "active" | "history";

function orderPath(order: Order) {
  if (order.type === "food")
    return {
      pathname: "/(driver)/food/[id]" as const,
      params: { id: String(order.id) },
    };
  if (order.type === "send")
    return {
      pathname: "/(driver)/send/[id]" as const,
      params: { id: String(order.id) },
    };
  return {
    pathname: "/(driver)/ride/[id]" as const,
    params: { id: String(order.id) },
  };
}

function OrderCard({
  order,
  action,
  onPress,
  loading,
  disabled,
  compact,
}: {
  order: Order;
  action?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { styles } = useScreenStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.orderCard,
        compact && styles.orderCardCompact,
        pressed && styles.pressed,
      ]}
    >
      {/* Top row: service + price */}
      <View style={styles.cardTop}>
        <ServiceLabel type={orderService(order)} />
        <Text style={styles.cardPrice}>{formatRupiah(order.total_price)}</Text>
      </View>

      {/* Route: pickup → destination */}
      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, styles.pickupDot]} />
          <Text style={styles.routeAddress} numberOfLines={1}>
            {order.pickup_address ?? "Jemput"}
          </Text>
        </View>

        <View style={styles.routeArrow}>
          <AppIcon name="down" size={12} color={Colors.primaryDark} />
        </View>

        <View style={styles.routeRow}>
          <View style={[styles.routeDot, styles.destDot]} />
          <Text style={styles.routeAddress} numberOfLines={1}>
            {order.destination_address ?? "Tujuan"}
          </Text>
        </View>
      </View>

      {/* Bottom row: metadata + action */}
      <View style={styles.cardBottom}>
        <View style={styles.cardMeta}>
          {order.pickup_distance != null && order.pickup_distance > 0 ? (
            <Text style={styles.metaText}>{order.pickup_distance} km</Text>
          ) : null}
          <Text style={styles.metaText}>{formatDateTime(order.created_at)}</Text>
        </View>
        {action ? (
          <Button
            compact
            title={action}
            loading={loading}
            disabled={disabled}
            onPress={onPress}
          />
        ) : (
          <OrderStatusBadge status={order.status} />
        )}
      </View>
    </Pressable>
  );
}

export default function DriverOrders() {
  const { styles } = useScreenStyles();
  const router = useRouter();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState<Segment>("available");

  const profile = useQuery({
    queryKey: driverKeys.profile,
    queryFn: getDriverProfile,
  });

  const canReceive =
    profile.data?.status === "approved" && profile.data.is_online;

  const active = useQuery({
    queryKey: driverKeys.active,
    queryFn: getActiveRide,
    enabled: !!profile.data,
    refetchInterval: ({ state }) => (state.data ? 5_000 : false),
  });

  const available = useQuery({
    queryKey: driverKeys.available,
    queryFn: listAvailableRides,
    enabled: canReceive,
    refetchInterval: canReceive ? 5_000 : false,
  });

  const history = useQuery({
    queryKey: driverKeys.history(page),
    queryFn: () => listDriverRideHistory(page),
    enabled: !!profile.data,
    placeholderData: keepPreviousData,
  });

  const accept = useMutation({
    mutationFn: acceptRide,
    onSuccess: async (order) => {
      client.setQueryData(driverKeys.active, order);
      await Promise.all([
        client.invalidateQueries({ queryKey: driverKeys.available }),
        client.invalidateQueries({ queryKey: ["driver", "rides", "history"] }),
      ]);
      router.push(orderPath(order));
    },
    onError: async () => {
      await client.invalidateQueries({ queryKey: driverKeys.available });
    },
  });

  const segments: [Segment, string][] = [
    ["available", "Tersedia"],
    ["active", "Aktif"],
    ["history", "Riwayat"],
  ];

  return (
    <Screen>
      <PageHeader
        eyebrow="DRIVER"
        title="Pesanan"
        description="Pesanan tersedia, aktif, dan riwayat."
      />

      {/* Segmented tabs */}
      <View style={styles.segments}>
        {segments.map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setSegment(key)}
            style={[
              styles.segment,
              segment === key && styles.segmentActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                segment === key && styles.segmentTextActive,
              ]}
            >
              {label}
              {key === "active" && active.data ? " · 1" : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {profile.isLoading ? (
        <StatusState type="loading" />
      ) : profile.isError ? (
        <StatusState
          type="error"
          message={getApiErrorMessage(profile.error)}
          action={
            <Button title="Coba lagi" onPress={() => profile.refetch()} />
          }
        />
      ) : segment === "available" ? (
        !canReceive ? (
          <StatusState
            type="empty"
            title={
              profile.data?.status !== "approved"
                ? "Driver belum disetujui"
                : "Kamu sedang offline"
            }
            message="Aktifkan status Online dari Beranda untuk menerima pesanan."
          />
        ) : available.isLoading ? (
          <StatusState type="loading" />
        ) : available.isError ? (
          <StatusState
            type="error"
            message={getApiErrorMessage(available.error)}
          />
        ) : !available.data?.length ? (
          <StatusState
            type="empty"
            title="Belum ada pesanan"
            message="Pesanan baru di sekitar kamu akan muncul otomatis."
          />
        ) : (
          <>
            {active.data ? (
              <View style={styles.activeNotice}>
                <Text style={styles.activeNoticeText}>
                  Selesaikan pesanan aktif terlebih dahulu sebelum menerima pesanan baru.
                </Text>
              </View>
            ) : null}
            {available.data.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                action={
                  active.data
                    ? "Selesaikan aktif"
                    : `Terima ${serviceLabel(orderService(order))}`
                }
                loading={accept.isPending && accept.variables === order.id}
                disabled={accept.isPending || !!active.data}
                onPress={() => {
                  if (active.data) {
                    router.push(orderPath(active.data));
                  } else {
                    accept.mutate(order.id);
                  }
                }}
              />
            ))}
            {accept.isError ? (
              <Text style={styles.error}>
                {getApiErrorMessage(accept.error)}
              </Text>
            ) : null}
          </>
        )
      ) : segment === "active" ? (
        active.isLoading ? (
          <StatusState type="loading" />
        ) : active.data ? (
          <OrderCard
            order={active.data}
            action="Lanjutkan"
            onPress={() => router.push(orderPath(active.data!))}
          />
        ) : (
          <StatusState
            type="empty"
            title="Tidak ada pesanan aktif"
            message="Pesanan yang kamu terima akan tampil di sini."
          />
        )
      ) : history.isLoading ? (
        <StatusState type="loading" />
      ) : history.isError ? (
        <StatusState type="error" message={getApiErrorMessage(history.error)} />
      ) : !history.data?.data.length ? (
        <StatusState type="empty" title="Belum ada riwayat" />
      ) : (
        <>
          {history.data.data.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => router.push(orderPath(order))}
            />
          ))}
          {history.data.last_page > 1 ? (
            <View style={styles.pagination}>
              <Button
                compact
                title="Sebelumnya"
                variant="secondary"
                disabled={page <= 1}
                onPress={() => setPage((v) => v - 1)}
              />
              <Text style={styles.pageInfo}>
                {page}/{history.data.last_page}
              </Text>
              <Button
                compact
                title="Berikutnya"
                variant="secondary"
                disabled={page >= history.data.last_page}
                onPress={() => setPage((v) => v + 1)}
              />
            </View>
          ) : null}
        </>
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
    /* Segments */
    segments: {
      flexDirection: "row",
      gap: 4,
      padding: 4,
      borderRadius: Radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    segment: {
      flex: 1,
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Radius.md,
    },
    segmentActive: {
      backgroundColor: colors.surface,
    },
    segmentText: {
      color: colors.muted,
      ...Typography.metadata,
      fontWeight: "700",
    },
    segmentTextActive: {
      color: Colors.primaryDark,
    },

    /* Order card */
    orderCard: {
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: 10,
    },
    orderCardCompact: {
      padding: 12,
    },
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardPrice: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },

    /* Route */
    routeSection: {
      gap: 3,
    },
    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    routeDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    pickupDot: {
      backgroundColor: Colors.primary,
    },
    destDot: {
      backgroundColor: Colors.danger,
    },
    routeArrow: {
      marginLeft: 2,
    },
    routeAddress: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
    },

    /* Card bottom */
    cardBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    cardMeta: {
      flexDirection: "row",
      gap: 10,
    },
    metaText: {
      color: colors.muted,
      ...Typography.caption,
    },

    /* Active notice */
    activeNotice: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: Colors.primarySoft,
      marginBottom: 10,
    },
    activeNoticeText: {
      color: Colors.primaryDark,
      fontSize: 13,
      fontWeight: "600",
    },

    /* Pagination */
    pagination: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
      marginTop: 4,
    },
    pageInfo: {
      color: colors.muted,
      ...Typography.caption,
    },

    /* Shared */
    error: {
      color: Colors.danger,
      ...Typography.body,
    },
    pressed: {
      opacity: 0.72,
    },
  });
