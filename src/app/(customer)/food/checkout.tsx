import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { RideMap } from '@/components/ride-map';
import { Button, Card, FormField, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { createFoodOrder } from '@/lib/api/food';
import { getApiErrorMessage } from '@/lib/api/client';
import { foodKeys } from '@/lib/food-query-keys';
import { formatRupiah } from '@/lib/format';
import { coordinateFromLocation, coordinateLabel, requestCurrentLocation, reverseGeocodeLabel, type Coordinate } from '@/lib/location';
import { orderKeys } from '@/lib/query-keys';
import { useCartStore } from '@/stores/cart-store';

export default function FoodCheckoutScreen() {
  const router = useRouter(); const client = useQueryClient(); const merchant = useCartStore((s) => s.merchant); const items = useCartStore((s) => s.items); const clear = useCartStore((s) => s.clear);
  const [destination, setDestination] = useState<Coordinate>(); const [address, setAddress] = useState(''); const [notes, setNotes] = useState(''); const [locationBusy, setLocationBusy] = useState(false); const [validation, setValidation] = useState('');
  const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const setPoint = async (point: Coordinate) => { setDestination(point); setAddress(coordinateLabel(point)); setLocationBusy(true); setAddress(await reverseGeocodeLabel(point)); setLocationBusy(false); };
  const handleUseGps = async () => { try { setValidation(''); setLocationBusy(true); await setPoint(coordinateFromLocation(await requestCurrentLocation())); } catch (error) { setValidation(error instanceof Error ? error.message : 'GPS tidak tersedia.'); } finally { setLocationBusy(false); } };
  const mutation = useMutation({ mutationFn: createFoodOrder, onSuccess: async ({ order }) => { clear(); await Promise.all([client.invalidateQueries({ queryKey: orderKeys.all }), client.invalidateQueries({ queryKey: foodKeys.merchants })]); router.replace({ pathname: '/(customer)/food/order/[id]', params: { id: String(order.id) } }); } });
  const submit = () => { if (!merchant || !items.length) return; if (!destination || !address.trim()) { setValidation('Pilih lokasi dan isi alamat tujuan pengantaran.'); return; } setValidation(''); mutation.mutate({ merchant_id: merchant.id, items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })), destination_address: address.trim(), destination_latitude: destination.latitude, destination_longitude: destination.longitude, payment_method: 'cash', notes: notes.trim() || null }); };
  if (!merchant || !items.length) return <Screen><StatusState type="empty" title="Cart kosong" action={<Button title="Cari Merchant" onPress={() => router.replace('/(customer)/food')} />} /></Screen>;
  return <Screen><Button title="Kembali" variant="secondary" onPress={() => router.back()} /><PageHeader eyebrow="Food Checkout" title="Lokasi pengantaran" description="Pickup berasal dari lokasi merchant. Harga final dihitung backend." />
    <Card><KeyValue label="Merchant" value={merchant.name} /><KeyValue label="Item" value={items.reduce((n, item) => n + item.quantity, 0)} /><KeyValue label="Subtotal preview" value={formatRupiah(subtotal)} /><KeyValue label="Pembayaran" value="Cash" /></Card>
    <Button title="Gunakan GPS saya" loading={locationBusy} onPress={() => void handleUseGps()} /><RideMap destination={destination} showsUserLocation onMapPress={(point) => void setPoint(point)} onDestinationChange={(point) => void setPoint(point)} focus="destination" />
    <Text style={styles.muted}>Tap peta atau geser marker untuk memilih tujuan.</Text><FormField label="Alamat tujuan" value={address} onChangeText={setAddress} placeholder="Alamat lengkap penerima" multiline /><FormField label="Catatan customer (opsional)" value={notes} onChangeText={setNotes} maxLength={500} multiline />
    {validation ? <Text style={styles.error}>{validation}</Text> : null}{mutation.isError ? <Text style={styles.error}>{getApiErrorMessage(mutation.error)}</Text> : null}<Button title="Buat Pesanan Food" loading={mutation.isPending} onPress={submit} />
  </Screen>;
}
const styles = StyleSheet.create({ muted: { color: Colors.muted, lineHeight: 20 }, error: { color: Colors.danger, lineHeight: 20 } });
