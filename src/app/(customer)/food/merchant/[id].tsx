import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, StyleSheet, Text } from 'react-native';
import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { getMerchantDetail } from '@/lib/api/food';
import { getApiErrorMessage } from '@/lib/api/client';
import { foodKeys } from '@/lib/food-query-keys';
import { formatRupiah } from '@/lib/format';
import { useCartStore } from '@/stores/cart-store';
import type { Product } from '@/types/api';

export default function MerchantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const merchantId = Number(id); const router = useRouter();
  const cartMerchant = useCartStore((s) => s.merchant); const items = useCartStore((s) => s.items); const addItem = useCartStore((s) => s.addItem); const replaceCart = useCartStore((s) => s.replaceCart);
  const query = useQuery({ queryKey: foodKeys.merchant(merchantId), queryFn: () => getMerchantDetail(merchantId), enabled: Number.isInteger(merchantId) && merchantId > 0 });
  const add = (product: Product) => { const merchant = query.data; if (!merchant) return; if (cartMerchant && cartMerchant.id !== merchant.id) Alert.alert('Ganti merchant?', 'Cart hanya dapat berisi produk dari satu merchant. Cart lama akan dikosongkan.', [{ text: 'Batal', style: 'cancel' }, { text: 'Ganti', style: 'destructive', onPress: () => replaceCart(merchant, product) }]); else addItem(merchant, product); };
  return <Screen><Button title="Kembali" variant="secondary" onPress={() => router.back()} /><PageHeader eyebrow="Food / UMKM" title={query.data?.name ?? 'Detail merchant'} />
    {items.length ? <Button title={`Lihat Cart (${items.reduce((n, item) => n + item.quantity, 0)})`} onPress={() => router.push('/(customer)/food/cart')} /> : null}
    {query.isLoading ? <StatusState type="loading" /> : query.isError ? <StatusState type="error" message={getApiErrorMessage(query.error)} action={<Button title="Coba lagi" variant="secondary" onPress={() => query.refetch()} />} /> : query.data ? <>
      <Card>{query.data.logo ? <Image source={{ uri: query.data.logo }} style={styles.logo} /> : null}<KeyValue label="Kategori" value={query.data.category?.name ?? '-'} /><KeyValue label="Status" value={query.data.is_open && query.data.is_active ? 'Buka' : 'Tutup'} /><Text style={styles.muted}>{query.data.description || 'Tidak ada deskripsi.'}</Text><Text style={styles.muted}>{query.data.address}</Text></Card>
      <Text style={styles.heading}>Produk</Text>{!(query.data.products ?? []).length ? <StatusState type="empty" message="Belum ada produk tersedia." /> : (query.data.products ?? []).map((product) => <Card key={product.id}>{product.image ? <Image source={{ uri: product.image }} style={styles.image} /> : null}<Text style={styles.title}>{product.name}</Text><Text style={styles.muted}>{product.description || 'Tidak ada deskripsi.'}</Text><KeyValue label="Harga" value={formatRupiah(product.price)} /><KeyValue label="Stok" value={product.stock} /><Button title={product.stock > 0 ? 'Tambah ke Cart' : 'Stok habis'} disabled={product.stock <= 0 || !query.data!.is_open || !query.data!.is_active} onPress={() => add(product)} /></Card>)}
    </> : null}
  </Screen>;
}
const styles = StyleSheet.create({ logo: { width: 72, height: 72, borderRadius: 14 }, image: { width: '100%', height: 150, borderRadius: 12 }, heading: { color: Colors.text, fontWeight: '800', fontSize: 20 }, title: { color: Colors.text, fontWeight: '800', fontSize: 17 }, muted: { color: Colors.muted, lineHeight: 20 } });
