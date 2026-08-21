import { useMemo as useThemeMemo , useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@/i18n";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { WarmGradientBg } from "@/components/warm-gradient-bg";
import {
  Button,
  Card,
  KeyValue,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { listMerchantOrders } from "@/lib/api/food";
import { getApiErrorMessage } from "@/lib/api/client";
import { foodKeys } from "@/lib/food-query-keys";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useAppTheme } from "@/stores/theme-store";

export default function MerchantOrdersScreen() {
  const { styles } = useScreenStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [...foodKeys.merchantOrders, page],
    queryFn: () => listMerchantOrders(page),
    placeholderData: keepPreviousData,
    refetchInterval: 5_000,
  });
  return (
    <Screen padded={false} scrollBottomPadding={false} className="gap-0 bg-background">
      <WarmGradientBg height={520} />
      <View className="gap-4 px-5" style={{ paddingTop: 16 }}>
        <PageHeader
          eyebrow={t("merchantDashboard.eyebrow")}
          title="Pesanan Makanan"
          description="Pesanan terbaru diperbarui otomatis."
        />
        {query.isLoading ? (
          <StatusState type="loading" />
        ) : query.isError ? (
          <StatusState
            type="error"
            message={getApiErrorMessage(query.error)}
            action={<Button title="Coba lagi" onPress={() => query.refetch()} />}
          />
        ) : !query.data?.data.length ? (
          <StatusState type="empty" message="Belum ada pesanan makanan." />
        ) : (
          <>
            {query.data.data.map((order) => (
              <Pressable
                key={order.id}
                onPress={() =>
                  router.push({
                    pathname: "/(merchant)/orders/[id]",
                    params: { id: String(order.id) },
                  })
                }
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Card>
                  <Text style={styles.title}>{order.order_number}</Text>
                  <OrderStatusBadge status={order.status} />
                  <KeyValue label="Pelanggan" value={order.user?.name ?? "-"} />
                  <KeyValue
                    label="Item"
                    value={
                      order.items
                        ?.map((item) => `${item.product_name} ×${item.quantity}`)
                        .join(", ") || "-"
                    }
                  />
                  <KeyValue
                    label="Total"
                    value={formatRupiah(order.total_price)}
                  />
                  <KeyValue
                    label="Dibuat"
                    value={formatDateTime(order.created_at)}
                  />
                </Card>
              </Pressable>
            ))}
            {query.data.last_page > 1 ? (
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Button
                    title="Sebelumnya"
                    variant="secondary"
                    disabled={page <= 1}
                    onPress={() => setPage((v) => v - 1)}
                  />
                </View>
                <Text>
                  {page}/{query.data.last_page}
                </Text>
                <View style={styles.flex}>
                  <Button
                    title="Berikutnya"
                    variant="secondary"
                    disabled={page >= query.data.last_page}
                    onPress={() => setPage((v) => v + 1)}
                  />
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  title: { color: colors.text, fontWeight: "800", fontSize: 17 },
  pressed: { opacity: 0.7 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1 },
});
