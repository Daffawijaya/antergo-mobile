import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/api/client';
import { getMerchantProfile, setMerchantOpen } from '@/lib/api/resources';

export default function MerchantHome() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['merchant', 'profile'], queryFn: getMerchantProfile });
  const mutation = useMutation({ mutationFn: setMerchantOpen, onSuccess: (merchant) => client.setQueryData(['merchant', 'profile'], (current: typeof query.data) => current ? { ...current, ...merchant } : current) });
  return <Screen><PageHeader eyebrow="Merchant" title={query.data?.name ?? 'Dashboard merchant'} description="Ringkasan operasional toko Anda." />{query.isLoading ? <StatusState type="loading" /> : query.isError ? <StatusState type="error" message={getApiErrorMessage(query.error)} action={<Button title="Coba lagi" variant="secondary" onPress={() => query.refetch()} />} /> : query.data ? <><Card><KeyValue label="Status toko" value={query.data.is_open ? 'Buka' : 'Tutup'} /><KeyValue label="Status akun" value={query.data.is_active ? 'Aktif' : 'Tidak aktif'} /><KeyValue label="Kategori" value={query.data.category?.name ?? '-'} /><KeyValue label="Jumlah produk" value={query.data.products.length} /><Button title={query.data.is_open ? 'Tutup toko' : 'Buka toko'} variant={query.data.is_open ? 'secondary' : 'primary'} loading={mutation.isPending} onPress={() => mutation.mutate(!query.data.is_open)} /></Card><Card><KeyValue label="Telepon" value={query.data.phone} /><KeyValue label="Alamat" value={query.data.address} /></Card>{mutation.isError ? <StatusState type="error" message={getApiErrorMessage(mutation.error)} /> : null}</> : <StatusState type="empty" />}</Screen>;
}
