import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { acceptRide, getActiveRide, getDriverProfile, listAvailableRides, listDriverRideHistory } from '@/lib/api/driver-rides';
import { getApiErrorMessage } from '@/lib/api/client';
import { driverKeys } from '@/lib/driver-query-keys';
import { formatDateTime, formatRupiah } from '@/lib/format';
import type { Order } from '@/types/api';

function orderPath(order: Order) {
  return order.type === 'food'
    ? { pathname: '/(driver)/food/[id]' as const, params: { id: String(order.id) } }
    : { pathname: '/(driver)/ride/[id]' as const, params: { id: String(order.id) } };
}
export default function DriverOrders() {
  const router = useRouter(); const client = useQueryClient(); const [page, setPage] = useState(1);
  const profile = useQuery({ queryKey: driverKeys.profile, queryFn: getDriverProfile });
  const canReceive = profile.data?.status === 'approved' && profile.data.is_online;
  const active = useQuery({ queryKey: driverKeys.active, queryFn: getActiveRide, enabled: !!profile.data, refetchInterval: ({ state }) => state.data ? 5_000 : false });
  const available = useQuery({ queryKey: driverKeys.available, queryFn: listAvailableRides, enabled: canReceive, refetchInterval: canReceive ? 5_000 : false });
  const history = useQuery({ queryKey: driverKeys.history(page), queryFn: () => listDriverRideHistory(page), enabled: !!profile.data, placeholderData: keepPreviousData });
  const accept = useMutation({ mutationFn: acceptRide, onSuccess: async (order) => { client.setQueryData(driverKeys.active, order); await Promise.all([client.invalidateQueries({ queryKey: driverKeys.available }), client.invalidateQueries({ queryKey: ['driver', 'rides', 'history'] })]); router.push(orderPath(order)); }, onError: async () => { await client.invalidateQueries({ queryKey: driverKeys.available }); } });
  return <Screen><PageHeader eyebrow="Driver" title="Order tersedia" description="Ride dan Food eligible diperbarui otomatis saat Anda online." />
    {profile.isLoading ? <StatusState type="loading" /> : profile.isError ? <StatusState type="error" title="Profil driver tidak tersedia" message={getApiErrorMessage(profile.error)} action={<Button title="Coba lagi" onPress={() => profile.refetch()} />} /> : profile.data ? <>
      {profile.data.status !== 'approved' ? <StatusState type="error" title="Driver belum approved" /> : !profile.data.is_online ? <StatusState type="empty" title="Anda sedang offline" message="Online dari Home untuk menerima order." /> : null}
      {active.data ? <Card><Text style={styles.heading}>{active.data.type === 'food' ? 'Food delivery aktif' : 'Ride aktif'}</Text><OrderStatusBadge status={active.data.status} /><KeyValue label="Tipe" value={active.data.type === 'food' ? '🍜 Food' : '🏍️ Ride'} /><KeyValue label="Order" value={active.data.order_number} /><KeyValue label="Pickup" value={active.data.pickup_address ?? '-'} /><Button title="Lanjutkan Order" onPress={() => router.push(orderPath(active.data!))} /></Card> : null}
      {canReceive ? <View style={styles.section}><Text style={styles.heading}>Order tersedia</Text>
        {available.isLoading ? <StatusState type="loading" /> : available.isError ? <StatusState type="error" message={getApiErrorMessage(available.error)} action={<Button title="Coba lagi" onPress={() => available.refetch()} />} /> : !available.data?.length ? <StatusState type="empty" message="Belum ada order eligible dalam radius driver." /> : available.data.map((order) => <Card key={order.id}>
          <Text style={styles.orderNumber}>{order.order_number}</Text><KeyValue label="Tipe" value={order.type === 'food' ? '🍜 Food' : '🏍️ Ride'} />
          {order.type === 'food' ? <><KeyValue label="Merchant" value={order.merchant?.name ?? '-'} /><KeyValue label="Items" value={order.items?.map((item) => `${item.product_name} ×${item.quantity}`).join(', ') || '-'} /><KeyValue label="Pembayaran" value={order.payment_method} /></> : null}
          <KeyValue label="Pickup" value={order.pickup_address ?? '-'} /><KeyValue label="Tujuan" value={order.destination_address ?? '-'} /><KeyValue label="Total" value={formatRupiah(order.total_price)} />{order.pickup_distance !== undefined ? <KeyValue label="Jarak ke pickup" value={`${order.pickup_distance} km`} /> : null}<KeyValue label="Dibuat" value={formatDateTime(order.created_at)} />
          <Button title={order.type === 'food' ? 'Terima Food Delivery' : 'Terima Ride'} loading={accept.isPending && accept.variables === order.id} disabled={accept.isPending || !!active.data} onPress={() => accept.mutate(order.id)} />
        </Card>)}{accept.isError ? <Text style={styles.error}>{getApiErrorMessage(accept.error)}</Text> : null}
      </View> : null}
      <View style={styles.section}><Text style={styles.heading}>Riwayat Ride & Food</Text>
        {history.isLoading ? <StatusState type="loading" /> : history.isError ? <StatusState type="error" message={getApiErrorMessage(history.error)} action={<Button title="Coba lagi" onPress={() => history.refetch()} />} /> : !history.data?.data.length ? <StatusState type="empty" message="Belum ada order selesai atau dibatalkan." /> : <>
          {history.data.data.map((order) => <Pressable key={order.id} onPress={() => router.push(orderPath(order))} style={({ pressed }) => pressed && styles.pressed}><Card><Text style={styles.orderNumber}>{order.order_number}</Text><KeyValue label="Tipe" value={order.type === 'food' ? '🍜 Food' : '🏍️ Ride'} /><OrderStatusBadge status={order.status} /><KeyValue label="Pickup" value={order.pickup_address ?? '-'} /><KeyValue label="Tujuan" value={order.destination_address ?? '-'} /><KeyValue label="Total" value={formatRupiah(order.total_price)} /><KeyValue label="Tanggal" value={formatDateTime(order.created_at)} /></Card></Pressable>)}
          {history.data.last_page > 1 ? <View style={styles.pagination}><View style={styles.flex}><Button title="Sebelumnya" variant="secondary" disabled={page <= 1} onPress={() => setPage((v) => v - 1)} /></View><Text>{page}/{history.data.last_page}</Text><View style={styles.flex}><Button title="Berikutnya" variant="secondary" disabled={page >= history.data.last_page} onPress={() => setPage((v) => v + 1)} /></View></View> : null}
        </>}
      </View>
    </> : null}
  </Screen>;
}
const styles = StyleSheet.create({ section: { gap: 12 }, heading: { color: Colors.text, fontSize: 18, fontWeight: '800' }, orderNumber: { color: Colors.text, fontSize: 17, fontWeight: '800' }, error: { color: Colors.danger }, pressed: { opacity: .7 }, pagination: { flexDirection: 'row', alignItems: 'center', gap: 10 }, flex: { flex: 1 } });
