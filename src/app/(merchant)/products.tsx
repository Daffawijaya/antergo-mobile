import { useQuery } from '@tanstack/react-query';

import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/api/client';
import { getMerchantProfile } from '@/lib/api/resources';

export default function MerchantProducts() {
  const query = useQuery({ queryKey: ['merchant', 'profile'], queryFn: getMerchantProfile });
  return <Screen><PageHeader eyebrow="Merchant" title="Produk" description="Katalog produk toko dari profil merchant." />{query.isLoading ? <StatusState type="loading" /> : query.isError ? <StatusState type="error" message={getApiErrorMessage(query.error)} action={<Button title="Coba lagi" variant="secondary" onPress={() => query.refetch()} />} /> : !query.data?.products.length ? <StatusState type="empty" message="Belum ada produk di katalog." /> : query.data.products.map((product) => <Card key={product.id}><KeyValue label="Produk" value={product.name} /><KeyValue label="Harga" value={`Rp ${Number(product.price).toLocaleString('id-ID')}`} /><KeyValue label="Stok" value={product.stock} /><KeyValue label="Status" value={product.is_available ? 'Tersedia' : 'Tidak tersedia'} /></Card>)}</Screen>;
}
