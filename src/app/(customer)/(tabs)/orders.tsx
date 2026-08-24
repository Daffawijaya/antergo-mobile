import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomerChip } from "@/components/customer-page";
import { OrderStatusBadge } from "@/components/order-status-badge";
import {
  orderService,
  serviceLabelKey,
  ServiceIcon,
} from "@/components/service-icon";
import { Button, PageHeader, Screen, StatusState } from "@/components/ui";
import { WarmGradientBg } from "@/components/warm-gradient-bg";
import { Colors } from "@/constants/colors";
import { listCustomerOrders } from "@/lib/api/rides";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { orderKeys } from "@/lib/query-keys";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";
import type { Order } from "@/types/api";

type Filter = "all" | "active" | "history";
const terminal = new Set(["completed", "cancelled", "rejected"]);
function orderPath(order: Order) {
  if (order.type === "food")
    return {
      pathname: "/(customer)/food/order/[id]" as const,
      params: { id: String(order.id) },
    };
  if (order.type === "send")
    return {
      pathname: "/(customer)/send/[id]" as const,
      params: { id: String(order.id) },
    };
  return {
    pathname: "/(customer)/ride/[id]" as const,
    params: { id: String(order.id) },
  };
}

export default function CustomerOrders() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const query = useQuery({
    queryKey: [...orderKeys.all, page],
    queryFn: () => listCustomerOrders(page),
    placeholderData: keepPreviousData,
  });
  const orders = useMemo(
    () =>
      (query.data?.data ?? []).filter(
        (order) =>
          filter === "all" ||
          (filter === "active"
            ? !terminal.has(order.status)
            : terminal.has(order.status)),
      ),
    [query.data?.data, filter],
  );
  return (
    <Screen padded={false} scrollBottomPadding={false} className="gap-0 bg-background">
      <WarmGradientBg height={380} />
      <View className="gap-4 px-4 pb-4" style={{ paddingTop: insets.top + 16 }}>
        <PageHeader
          eyebrow="ANTERGO"
          title={t("orders.title")}
          description={t("orders.description")}
        />
        <View style={styles.filters}>
          <CustomerChip
            label={t("orders.all")}
            selected={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <CustomerChip
            label={t("orders.active")}
            selected={filter === "active"}
            onPress={() => setFilter("active")}
          />
          <CustomerChip
            label={t("orders.history")}
            selected={filter === "history"}
            onPress={() => setFilter("history")}
          />
        </View>
      </View>
      <View className="gap-3 px-4 pb-4">
        {query.isLoading ? (
          <StatusState type="loading" />
        ) : query.isError ? (
          <StatusState
            type="error"
            message={getApiErrorMessage(query.error)}
            action={
              <Button
                title={t("common.tryAgain")}
                variant="secondary"
                onPress={() => query.refetch()}
              />
            }
          />
        ) : !orders.length ? (
          <StatusState
            type="empty"
            title={t("orders.noActivity")}
            message={
              filter === "active"
                ? t("orders.noActive")
                : t("orders.historyDesc")
            }
          />
        ) : (
          <View className="gap-3 px-4">
            {orders.map((order) => (
              <Pressable
                key={order.id}
                onPress={() => router.push(orderPath(order))}
                style={({ pressed }) => [
                  styles.orderRow,
                  pressed && styles.pressed,
                ]}
              >
                <ServiceIcon type={orderService(order)} size={50} />
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <Text style={styles.type}>
                      {t(serviceLabelKey(orderService(order)))}
                    </Text>
                    <Text style={styles.total}>
                      {formatRupiah(order.total_price)}
                    </Text>
                  </View>
                  <Text style={styles.number}>{order.order_number}</Text>
                  <Text numberOfLines={1} style={styles.address}>
                    {order.destination_address ??
                      order.pickup_address ??
                      t("orders.orderDetails")}
                  </Text>
                  <View style={styles.metaRow}>
                    <OrderStatusBadge status={order.status} />
                    <Text style={styles.date}>
                      {formatDateTime(order.created_at)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        {query.data && query.data.last_page > 1 ? (
          <View style={styles.pagination}>
            <View style={styles.flex}>
              <Button
                compact
                title={t("common.previous")}
                variant="secondary"
                disabled={page <= 1 || query.isFetching}
                onPress={() => setPage((v) => v - 1)}
              />
            </View>
            <Text style={styles.page}>
              {page}/{query.data.last_page}
            </Text>
            <View style={styles.flex}>
              <Button
                compact
                title={t("common.next")}
                variant="secondary"
                disabled={page >= query.data.last_page || query.isFetching}
                onPress={() => setPage((v) => v + 1)}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  filters: { flexDirection: "row", gap: 7 },
  orderRow: {
    minHeight: 108,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  copy: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  type: { color: colors.text, fontSize: 18, fontFamily: "Outfit_700Bold" },
  total: {
    color: Colors.primaryDark,
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
  },
  number: { color: colors.muted, fontSize: 12, fontFamily: "Outfit_500Medium" },
  address: { color: colors.muted, fontSize: 14, fontFamily: "Outfit_400Regular" },
  metaRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  date: { color: colors.muted, fontSize: 11, fontFamily: "Outfit_400Regular" },
  pressed: { opacity: 0.65 },
  pagination: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1 },
  page: { color: colors.muted, fontFamily: "Outfit_500Medium" },
});
