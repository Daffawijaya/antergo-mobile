import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { RideMap } from '@/components/ride-map';
import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { getDriverRideDetail, updateFoodDeliveryStatus } from '@/lib/api/driver-rides';
import { getApiErrorMessage } from '@/lib/api/client';
import { driverKeys } from '@/lib/driver-query-keys';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { parseCoordinate } from '@/lib/location';
import type { DriverFoodStatusUpdate, OrderStatus } from '@/types/api';

const actions: Partial<Record<OrderStatus, { title: string; status: DriverFoodStatusUpdate }>> = {
  driver_assigned: { title: 'Pesanan Sudah Diambil', status: 'picked_up' },
  picked_up: { title: 'Mulai Antar', status: 'delivering' },
  delivering: { title: 'Pesanan Terkirim', status: 'completed' },
};
export default function DriverFoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const orderId = Number(id); const router = useRouter(); const client = useQueryClient();
  const query = useQuery({ queryKey: ['driver', 'food', 'detail', orderId], queryFn: () => getDriverRideDetail(orderId), enabled: orderId > 0, refetchInterval: ({ state }) => state.data && ['completed', 'cancelled'].includes(state.data.status) ? false : 5_000 });
  const transition = useMutation({ mutationFn: (status: DriverFoodStatusUpdate) => updateFoodDeliveryStatus(orderId, status), onSuccess: async (order) => { client.setQueryData(['driver', 'food', 'detail', orderId], order); await Promise.all([client.invalidateQueries({ queryKey: driverKeys.active }), client.invalidateQueries({ queryKey: driverKeys.available }), client.invalidateQueries({ queryKey: ['driver', 'rides', 'history'] })]); if (order.status === 'completed') router.replace('/(driver)/orders'); } });
  const order = query.data; const action = order ? actions[order.status] : undefined;
  if (order && order.type !== 'food') return <Screen><StatusState type="error" message="Order ini bukan Food delivery." action={<Button title="Kembali" onPress={() => router.back()} />} /></Screen>;
  return <Screen><Button title="Kembali" variant="secondary" onPress={() => router.back()} /><PageHeader eyebrow="Driver Food" title={order?.order_number ?? 'Food delivery'} description="Ambil pesanan di merchant lalu antar ke customer." />
    {query.isLoading ? <StatusState type="loading" /> : query.isError ? <StatusState type="error" message={getApiErrorMessage(query.error)} action={<Button title="Coba lagi" onPress={() => query.refetch()} />} /> : order ? <>
      <Card><OrderStatusBadge status={order.status} /><KeyValue label="Merchant" value={order.merchant?.name ?? '-'} /><KeyValue label="Pickup merchant" value={order.pickup_address ?? order.merchant?.address ?? '-'} /><KeyValue label="Tujuan customer" value={order.destination_address ?? '-'} /><KeyValue label="Total" value={formatRupiah(order.total_price)} /><KeyValue label="Pembayaran" value={`${order.payment_method} · ${order.payment_status}`} /></Card>
      <RideMap pickup={parseCoordinate(order.pickup_latitude, order.pickup_longitude)} destination={parseCoordinate(order.destination_latitude, order.destination_longitude)} driver={parseCoordinate(order.driver?.location?.latitude, order.driver?.location?.longitude)} focus="all" />
      <Card><Text style={styles.heading}>Items</Text>{order.items?.map((item) => <View key={item.id} style={styles.item}><Text style={styles.title}>{item.product_name} × {item.quantity}</Text><KeyValue label="Subtotal" value={formatRupiah(item.subtotal)} /></View>) ?? <Text style={styles.muted}>Item tidak tersedia pada response.</Text>}</Card>
      <Card><Text style={styles.heading}>Customer</Text><KeyValue label="Nama" value={order.user?.name ?? '-'} /><KeyValue label="Telepon" value={order.user?.phone ?? '-'} /><KeyValue label="Alamat" value={order.destination_address ?? '-'} /><KeyValue label="Catatan" value={order.notes || '-'} /></Card>
      {action ? <Card><Text style={styles.muted}>Pastikan tahap pengantaran sudah benar sebelum memperbarui status.</Text><Button title={action.title} loading={transition.isPending} onPress={() => transition.mutate(action.status)} />{transition.isError ? <Text style={styles.error}>{getApiErrorMessage(transition.error)}</Text> : null}</Card> : null}
      <Card><Text style={styles.heading}>Riwayat status</Text>{order.status_histories?.map((history) => <View key={history.id} style={styles.item}><OrderStatusBadge status={history.status} /><Text style={styles.muted}>{formatDateTime(history.created_at)}</Text>{history.note ? <Text style={styles.muted}>{history.note}</Text> : null}</View>)}</Card>
    </> : null}
  </Screen>;
}
const styles = StyleSheet.create({ heading: { color: Colors.text, fontWeight: '800', fontSize: 18 }, title: { color: Colors.text, fontWeight: '700' }, item: { gap: 6, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }, muted: { color: Colors.muted, lineHeight: 20 }, error: { color: Colors.danger } });
