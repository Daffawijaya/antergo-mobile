import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { listMerchantOrders } from '@/lib/api/food';
import { getApiErrorMessage } from '@/lib/api/client';
import { foodKeys } from '@/lib/food-query-keys';
import { formatDateTime, formatRupiah } from '@/lib/format';

export default function MerchantOrdersScreen() {
  const router = useRouter(); const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: [...foodKeys.merchantOrders, page], queryFn: () => listMerchantOrders(page), placeholderData: keepPreviousData, refetchInterval: 5_000 });
  return <Screen><PageHeader eyebrow="Merchant" title="Pesanan Food" description="Pesanan terbaru diperbarui otomatis." />
    {query.isLoading ? <StatusState type="loading" /> : query.isError ? <StatusState type="error" message={getApiErrorMessage(query.error)} action={<Button title="Coba lagi" onPress={() => query.refetch()} />} /> : !query.data?.data.length ? <StatusState type="empty" message="Belum ada pesanan Food." /> : <>
      {query.data.data.map((order) => <Pressable key={order.id} onPress={() => router.push({ pathname: '/(merchant)/orders/[id]', params: { id: String(order.id) } })} style={({ pressed }) => pressed && styles.pressed}><Card><Text style={styles.title}>{order.order_number}</Text><OrderStatusBadge status={order.status} /><KeyValue label="Customer" value={order.user?.name ?? '-'} /><KeyValue label="Items" value={order.items?.map((item) => `${item.product_name} ×${item.quantity}`).join(', ') || '-'} /><KeyValue label="Total" value={formatRupiah(order.total_price)} /><KeyValue label="Dibuat" value={formatDateTime(order.created_at)} /></Card></Pressable>)}
      {query.data.last_page > 1 ? <View style={styles.row}><View style={styles.flex}><Button title="Sebelumnya" variant="secondary" disabled={page <= 1} onPress={() => setPage((v) => v - 1)} /></View><Text>{page}/{query.data.last_page}</Text><View style={styles.flex}><Button title="Berikutnya" variant="secondary" disabled={page >= query.data.last_page} onPress={() => setPage((v) => v + 1)} /></View></View> : null}
    </>}
  </Screen>;
}
const styles = StyleSheet.create({ title: { color: Colors.text, fontWeight: '800', fontSize: 17 }, pressed: { opacity: .7 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, flex: { flex: 1 } });
