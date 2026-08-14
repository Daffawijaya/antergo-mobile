import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { getApiErrorMessage } from '@/lib/api/client';
import { getDriverProfile, setDriverOnline } from '@/lib/api/resources';

export default function DriverHome() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['driver', 'profile'], queryFn: getDriverProfile });
  const mutation = useMutation({ mutationFn: setDriverOnline, onSuccess: (driver) => client.setQueryData(['driver', 'profile'], driver) });
  return <Screen><PageHeader eyebrow="Driver" title="Dashboard driver" description="Kelola kesiapan menerima order." />{query.isLoading ? <StatusState type="loading" /> : query.isError ? <StatusState type="error" message={getApiErrorMessage(query.error)} action={<Button title="Coba lagi" variant="secondary" onPress={() => query.refetch()} />} /> : query.data ? <><Card><KeyValue label="Status akun" value={query.data.status} /><KeyValue label="Ketersediaan" value={query.data.is_online ? 'Online' : 'Offline'} /><KeyValue label="Rating" value={query.data.rating} /><Button title={query.data.is_online ? 'Jadikan offline' : 'Jadikan online'} variant={query.data.is_online ? 'secondary' : 'primary'} loading={mutation.isPending} onPress={() => mutation.mutate(!query.data.is_online)} /></Card><Card><KeyValue label="Kendaraan" value={query.data.vehicle ? `${query.data.vehicle.brand} ${query.data.vehicle.model}` : 'Belum tersedia'} /><KeyValue label="Plat nomor" value={query.data.vehicle?.plate_number ?? '-'} /><KeyValue label="Tipe" value={query.data.vehicle?.type ?? '-'} /></Card>{mutation.isError ? <StatusState type="error" message={getApiErrorMessage(mutation.error)} /> : null}</> : <StatusState type="empty" />}</Screen>;
}
