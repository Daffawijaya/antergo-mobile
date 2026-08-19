import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage } from "@/lib/api/client";
import {
  getCustomerOrders,
  getDriverOrders,
  getMerchantOrders,
} from "@/lib/api/resources";
import type { UserRole } from "@/types/api";
import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from "./ui";

const fetchers = {
  customer: getCustomerOrders,
  driver: getDriverOrders,
  merchant: getMerchantOrders,
} as const;

export function OrdersScreen({ role }: { role: Exclude<UserRole, "admin"> }) {
  const query = useQuery({
    queryKey: [role, "orders"],
    queryFn: fetchers[role],
  });
  return (
    <Screen>
      <PageHeader
        eyebrow={role}
        title="Pesanan"
        description={
          role === "driver"
            ? "Permintaan yang tersedia untuk diambil."
            : "Daftar pesanan terbaru Anda."
        }
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
      ) : !query.data?.data.length ? (
        <StatusState
          type="empty"
          message="Data akan muncul di sini saat tersedia."
        />
      ) : (
        query.data.data.map((order) => (
          <Card key={order.id}>
            <KeyValue label="Nomor" value={order.order_number} />
            <KeyValue label="Tipe" value={order.type} />
            <KeyValue
              label="Status"
              value=          {order.status.replaceAll("_", " ")}
            />
            <KeyValue
              label="Total"
              value={`Rp ${Number(order.total_price).toLocaleString("id-ID")}`}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
