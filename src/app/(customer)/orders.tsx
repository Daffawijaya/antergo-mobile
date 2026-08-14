import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderStatusBadge } from '@/components/order-status-badge';
import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { listCustomerOrders } from '@/lib/api/rides';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { orderKeys } from '@/lib/query-keys';

export default function CustomerOrders() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: [...orderKeys.all, page], queryFn: () => listCustomerOrders(page), placeholderData: keepPreviousData });
  return <Screen>
    <PageHeader eyebrow="Customer" title="Riwayat pesanan" description="Pesanan terbaru Anda dari Laravel API." />
    {query.isLoading ? <StatusState type="loading" /> : query.isError ? <StatusState type="error" message={getApiErrorMessage(query.error)} action={<Button title="Coba lagi" variant="secondary" onPress={() => query.refetch()} />} /> : !query.data?.data.length ? <StatusState type="empty" message="Belum ada pesanan. Buat Ride pertama dari Home." /> : <>
      {query.data.data.map((order) => <Pressable key={order.id} disabled={order.type === 'send'} onPress={() => router.push({ pathname: order.type === 'food' ? '/(customer)/food/order/[id]' : '/(customer)/ride/[id]', params: { id: String(order.id) } })} style={({ pressed }) => pressed && styles.pressed}>
        <Card>
          <View style={styles.heading}><Text style={styles.orderNumber}>{order.order_number}</Text><OrderStatusBadge status={order.status} /></View>
          <KeyValue label="Tipe" value={order.type === 'food' ? '🍜 Food' : order.type === 'ride' ? '🏍️ Ride' : '📦 Send'} />
          <KeyValue label="Jemput" value={order.pickup_address ?? '-'} />
          <KeyValue label="Tujuan" value={order.destination_address ?? '-'} />
          <KeyValue label="Total" value={formatRupiah(order.total_price)} />
          <KeyValue label="Tanggal" value={formatDateTime(order.created_at)} />
          <Text style={styles.hint}>{order.type === 'send' ? 'Detail Send belum tersedia' : 'Tap untuk melihat detail'}</Text>
        </Card>
      </Pressable>)}
      {query.data.last_page > 1 ? <View style={styles.pagination}>
        <View style={styles.pageButton}><Button title="Sebelumnya" variant="secondary" disabled={page <= 1 || query.isFetching} onPress={() => setPage((value) => value - 1)} /></View>
        <Text style={styles.pageLabel}>{page} / {query.data.last_page}</Text>
        <View style={styles.pageButton}><Button title="Berikutnya" variant="secondary" disabled={page >= query.data.last_page || query.isFetching} onPress={() => setPage((value) => value + 1)} /></View>
      </View> : null}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({ heading: { gap: 10 }, orderNumber: { color: Colors.text, fontWeight: '800', fontSize: 17 }, hint: { color: Colors.primary, fontWeight: '700', fontSize: 13 }, pressed: { opacity: .7 }, pagination: { flexDirection: 'row', alignItems: 'center', gap: 10 }, pageButton: { flex: 1 }, pageLabel: { color: Colors.muted, fontWeight: '700' } });
