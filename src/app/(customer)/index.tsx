import { StyleSheet, Text, View } from 'react-native';

import { Card, PageHeader, Screen } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth-store';

const shortcuts = [{ icon: '🏍️', title: 'Ride', detail: 'Antar ke tujuan' }, { icon: '🍜', title: 'Food / UMKM', detail: 'Jelajahi merchant' }, { icon: '📦', title: 'Send', detail: 'Segera hadir', disabled: true }];
export default function CustomerHome() {
  const user = useAuthStore((state) => state.user);
  return <Screen><PageHeader eyebrow="Customer" title={`Halo, ${user?.name?.split(' ')[0] ?? 'Kamu'}`} description="Mau pergi atau pesan sesuatu hari ini?" /><View style={styles.grid}>{shortcuts.map((item) => <Card key={item.title}><Text style={styles.icon}>{item.icon}</Text><Text style={styles.title}>{item.title}</Text><Text style={[styles.detail, item.disabled && styles.disabled]}>{item.detail}</Text></Card>)}</View><Card><Text style={styles.sectionTitle}>Fondasi siap</Text><Text style={styles.detail}>Ride dan Food terhubung melalui Laravel API. Map, tracking, dan payment belum diaktifkan pada tahap ini.</Text></Card></Screen>;
}
const styles = StyleSheet.create({ grid: { gap: 12 }, icon: { fontSize: 28 }, title: { color: Colors.text, fontWeight: '800', fontSize: 17 }, detail: { color: Colors.muted, lineHeight: 20 }, disabled: { color: Colors.warning }, sectionTitle: { color: Colors.text, fontWeight: '800', fontSize: 17 } });
