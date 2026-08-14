import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, PageHeader, Screen } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';

export default function CustomerHome() {
  const router = useRouter(); const user = useAuthStore((state) => state.user); const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const shortcuts = [
    { icon: '🏍️', title: 'Ride', detail: 'Buat perjalanan baru', action: () => router.push('/(customer)/ride/create') },
    { icon: '🍜', title: 'Food / UMKM', detail: cartCount ? `Lanjutkan cart (${cartCount})` : 'Cari merchant dan makanan', action: () => router.push(cartCount ? '/(customer)/food/cart' : '/(customer)/food') },
  ];
  return <Screen><PageHeader eyebrow="Customer" title={`Halo, ${user?.name?.split(' ')[0] ?? 'Kamu'}`} description="Mau pergi atau pesan makanan hari ini?" /><View style={styles.grid}>
    {shortcuts.map((item) => <Pressable key={item.title} accessibilityRole="button" onPress={item.action} style={({ pressed }) => pressed && styles.pressed}><Card><Text style={styles.icon}>{item.icon}</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.detail}>{item.detail}</Text></Card></Pressable>)}
    <Card><Text style={styles.icon}>📦</Text><Text style={styles.title}>Send</Text><Text style={styles.disabled}>Segera hadir</Text></Card>
  </View></Screen>;
}
const styles = StyleSheet.create({ grid: { gap: 12 }, pressed: { opacity: .75 }, icon: { fontSize: 28 }, title: { color: Colors.text, fontWeight: '800', fontSize: 17 }, detail: { color: Colors.muted, lineHeight: 20 }, disabled: { color: Colors.warning } });
