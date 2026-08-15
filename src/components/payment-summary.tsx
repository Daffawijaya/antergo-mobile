import { useMemo as useThemeMemo } from "react";
import { StyleSheet, Text } from "react-native";

import { Card, KeyValue } from "@/components/ui";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type { Order } from "@/types/api";
import { useAppTheme } from "@/stores/theme-store";

export function PaymentSummary({ order }: { order: Order }) {
  const { styles } = useScreenStyles();
  const paid = order.payment_status === "paid";
  return (
    <Card>
      <Text style={styles.title}>Pembayaran</Text>
      <KeyValue
        label="Metode"
        value={order.payment_method === "cash" ? "Tunai" : order.payment_method}
      />
      <KeyValue label="Status" value={paid ? "Lunas" : "Belum Dibayar"} />
      <KeyValue
        label="Total"
        value={formatRupiah(order.payment?.amount ?? order.total_price)}
      />
      {order.payment?.paid_at ? (
        <KeyValue
          label="Diterima pada"
          value={formatDateTime(order.payment.paid_at)}
        />
      ) : null}
    </Card>
  );
}

function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
});
