import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, KeyValue, PageHeader, Screen, StatusState } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { listMerchants } from '@/lib/api/food';
import { getApiErrorMessage } from '@/lib/api/client';
import { foodKeys } from '@/lib/food-query-keys';

export default function MerchantListScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: [...foodKeys.merchants, page], queryFn: () => listMerchants(page), placeholderData: keepPreviousData });
  return <Screen><Button title="Kembali" variant="secondary" onPress={() => router.back()} /><PageHeader eyebrow="Food / UMKM" title="Merchant terdekat" description="Merchant aktif yang sedang buka dari AnterGo." />
    {query.isLoading ? <StatusState type="loading" /> : query.isError ? <StatusState type="error" message={getApiErrorMessage(query.error)} action={<Button title="Coba lagi" variant="secondary" onPress={() => query.refetch()} />} /> : !query.data?.data.length ? <StatusState type="empty" message="Belum ada merchant yang sedang buka." /> : <>
      {query.data.data.map((merchant) => <Pressable key={merchant.id} onPress={() => router.push({ pathname: '/(customer)/food/merchant/[id]', params: { id: String(merchant.id) } })} style={({ pressed }) => pressed && styles.pressed}><Card>
        {merchant.logo ? <Image source={{ uri: merchant.logo }} style={styles.logo} /> : null}<Text style={styles.title}>{merchant.name}</Text><KeyValue label="Kategori" value={merchant.category?.name ?? '-'} /><KeyValue label="Status" value={merchant.is_open ? 'Buka' : 'Tutup'} /><Text style={styles.muted}>{merchant.address}</Text>
      </Card></Pressable>)}
      {query.data.last_page > 1 ? <View style={styles.row}><View style={styles.flex}><Button title="Sebelumnya" variant="secondary" disabled={page <= 1} onPress={() => setPage((v) => v - 1)} /></View><Text>{page}/{query.data.last_page}</Text><View style={styles.flex}><Button title="Berikutnya" variant="secondary" disabled={page >= query.data.last_page} onPress={() => setPage((v) => v + 1)} /></View></View> : null}
    </>}
  </Screen>;
}
const styles = StyleSheet.create({ pressed: { opacity: .7 }, logo: { width: 64, height: 64, borderRadius: 12 }, title: { color: Colors.text, fontWeight: '800', fontSize: 18 }, muted: { color: Colors.muted, lineHeight: 20 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, flex: { flex: 1 } });
