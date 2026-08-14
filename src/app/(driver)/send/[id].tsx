import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { OrderStatusBadge } from '@/components/order-status-badge';
import { PaymentSummary } from '@/components/payment-summary';
import { RideMap } from '@/components/ride-map';
import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { getApiErrorMessage } from '@/lib/api/client';
import { getDriverRideDetail } from '@/lib/api/driver-rides';
import { settleCashPayment } from '@/lib/api/payment-rating';
import { updateSendStatus } from '@/lib/api/send';
import { driverKeys } from '@/lib/driver-query-keys';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { parseCoordinate } from '@/lib/location';
import type { DriverSendStatusUpdate, OrderStatus } from '@/types/api';

const actions: Partial<Record<OrderStatus, { title: string; status: DriverSendStatusUpdate }>> = {
  driver_assigned: { title: 'Sudah Sampai Lokasi Pickup', status: 'driver_arrived' }, driver_arrived: { title: 'Barang Sudah Diambil', status: 'picked_up' }, picked_up: { title: 'Mulai Antar', status: 'delivering' }, delivering: { title: 'Barang Sudah Diterima', status: 'completed' },
};
export default function DriverSendDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const orderId = Number(id); const router = useRouter(); const client = useQueryClient(); const key = ['driver', 'send', 'detail', orderId] as const;
  const query = useQuery({ queryKey: key, queryFn: () => getDriverRideDetail(orderId), enabled: orderId > 0, refetchInterval: ({ state }) => state.data && ['completed', 'cancelled'].includes(state.data.status) ? false : 5_000 });
  const invalidate = () => Promise.all([client.invalidateQueries({ queryKey: driverKeys.active }), client.invalidateQueries({ queryKey: driverKeys.available }), client.invalidateQueries({ queryKey: ['driver', 'rides', 'history'] })]);
  const transition = useMutation({ mutationFn: (status: DriverSendStatusUpdate) => updateSendStatus(orderId, status), onSuccess: async (order) => { client.setQueryData(key, order); await invalidate(); } });
  const settle = useMutation({ mutationFn: () => settleCashPayment(orderId), onSuccess: async (order) => { client.setQueryData(key, order); await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: ['driver', 'rides', 'history'] })]); } });
  const order = query.data; const action = order ? actions[order.status] : undefined;
  if (order && order.type !== 'send') return <Screen><StatusState type="error" message="Order ini bukan Send." /></Screen>;
  const focus = order && ['picked_up', 'delivering', 'completed'].includes(order.status) ? 'destination' : 'pickup';
  return <Screen><Button title="Kembali" variant="secondary" onPress={() => router.back()} /><PageHeader eyebrow="Driver Send" title={order?.order_number ?? 'Kirim barang'} description="Ambil barang dari customer lalu antar ke penerima." />
    {query.isLoading ? <StatusState type="loading" /> : query.isError ? <StatusState type="error" message={getApiErrorMessage(query.error)} action={<Button title="Coba lagi" onPress={() => query.refetch()} />} /> : order ? <>
      <Card><OrderStatusBadge status={order.status} /><KeyValue label="Pickup customer" value={order.pickup_address ?? '-'} /><KeyValue label="Tujuan penerima" value={order.destination_address ?? '-'} /><KeyValue label="Total" value={formatRupiah(order.total_price)} /></Card><PaymentSummary order={order} />
      <RideMap pickup={parseCoordinate(order.pickup_latitude, order.pickup_longitude)} destination={parseCoordinate(order.destination_latitude, order.destination_longitude)} driver={parseCoordinate(order.driver?.location?.latitude, order.driver?.location?.longitude)} focus={focus} />
      <Card><Text style={styles.title}>Barang dan penerima</Text><KeyValue label="Barang" value={order.send_details?.item_name ?? '-'} /><KeyValue label="Deskripsi" value={order.send_details?.item_description || '-'} /><KeyValue label="Penerima" value={order.send_details?.recipient_name ?? '-'} /><KeyValue label="Telepon" value={order.send_details?.recipient_phone ?? '-'} /><KeyValue label="Catatan" value={order.notes || '-'} /></Card>
      {action ? <Card><Text style={styles.muted}>Pastikan tahap pengiriman sudah benar sebelum memperbarui status.</Text>{transition.isError ? <Text style={styles.error}>{getApiErrorMessage(transition.error)}</Text> : null}<Button title={action.title} loading={transition.isPending} onPress={() => transition.mutate(action.status)} /></Card> : null}
      {order.status === 'completed' ? <Card><Text style={styles.title}>Pembayaran tunai</Text>{order.payment_status === 'paid' ? <><Text style={styles.muted}>Pembayaran sudah diterima.</Text><Button title="Kembali ke Order" onPress={() => router.replace('/(driver)/orders')} /></> : <><Text style={styles.title}>Total diterima: {formatRupiah(order.total_price)}</Text>{settle.isError ? <Text style={styles.error}>{getApiErrorMessage(settle.error)}</Text> : null}<Button title="Pembayaran Tunai Diterima" loading={settle.isPending} onPress={() => settle.mutate()} /></>}</Card> : null}
      <Card><Text style={styles.title}>Riwayat status</Text>{order.status_histories?.map((history) => <View key={history.id} style={styles.history}><OrderStatusBadge status={history.status} /><Text style={styles.muted}>{formatDateTime(history.created_at)}</Text>{history.note ? <Text style={styles.muted}>{history.note}</Text> : null}</View>)}</Card>
    </> : null}
  </Screen>;
}
const styles = StyleSheet.create({ title: { color: Colors.text, fontSize: 18, fontWeight: '800' }, muted: { color: Colors.muted, lineHeight: 20 }, history: { gap: 6, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }, error: { color: Colors.danger } });
