import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OrderStatusBadge } from "@/components/order-status-badge";
import {
  orderService,
  serviceLabel,
  ServiceLabel,
} from "@/components/service-icon";
import { Button, Card, PageHeader, Screen, StatusState } from "@/components/ui";
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
function acceptLabel(order: Order) {
  return `Terima ${serviceLabel(orderService(order))}`;
}
function OrderCard({
  order,
  action,
  onPress,
  loading,
  disabled,
}: {
  order: Order;
  action?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Card>
      <View style={styles.cardTop}>
        <ServiceLabel type={orderService(order)} />
        <OrderStatusBadge status={order.status} />
      </View>
      <Text style={styles.route} numberOfLines={1}>
        {order.pickup_address ?? "Pickup"} →{" "}
        {order.destination_address ?? "Tujuan"}
      </Text>
      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.meta}>{formatDateTime(order.created_at)}</Text>
          <Text style={styles.price}>{formatRupiah(order.total_price)}</Text>
        </View>
        <Button
          compact
          title={action ?? "Lihat detail"}
          loading={loading}
          disabled={disabled}
          onPress={onPress}
        />
      </View>
    </Card>
  );
}
export default function DriverOrders() {
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
  return (
    <Screen>
      <PageHeader
        eyebrow="DRIVER"
        title="Pesanan"
        description="Order tersedia, aktif, dan riwayat dalam satu tempat."
      />
      <View style={styles.segments}>
        {(
          [
            ["available", "Tersedia"],
            ["active", "Aktif"],
            ["history", "Riwayat"],
          ] as [Segment, string][]
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setSegment(key)}
            style={[styles.segment, segment === key && styles.segmentActive]}
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
            {available.data.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                action={acceptLabel(order)}
                loading={accept.isPending && accept.variables === order.id}
                disabled={accept.isPending || !!active.data}
                onPress={() => accept.mutate(order.id)}
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
            <Pressable
              key={order.id}
              onPress={() => router.push(orderPath(order))}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <OrderCard
                order={order}
                onPress={() => router.push(orderPath(order))}
              />
            </Pressable>
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
              <Text style={styles.meta}>
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
const styles = StyleSheet.create({
  segments: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceMuted,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
  },
  segmentActive: { backgroundColor: Colors.surface },
  segmentText: {
    color: Colors.muted,
    ...Typography.metadata,
    fontWeight: "700",
  },
  segmentTextActive: { color: Colors.primaryDark },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  route: { color: Colors.text, ...Typography.body, fontWeight: "700" },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: Spacing.md,
  },
  meta: { color: Colors.muted, ...Typography.caption },
  price: { color: Colors.text, ...Typography.cardTitle },
  error: { color: Colors.danger, ...Typography.body },
  pressed: { opacity: 0.72 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
});
