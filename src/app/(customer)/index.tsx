import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { ServiceIcon, ServiceLabel } from '@/components/service-icon';
import { Card, PageHeader, Screen, SectionHeader } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/colors';
import { listCustomerOrders } from '@/lib/api/rides';
import { formatRupiah } from '@/lib/format';
import { orderKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import type { Order } from '@/types/api';

function orderPath(order: Order) {
  if (order.type === 'food') return { pathname: '/(customer)/food/order/[id]' as const, params: { id: String(order.id) } };
  if (order.type === 'send') return { pathname: '/(customer)/send/[id]' as const, params: { id: String(order.id) } };
  return { pathname: '/(customer)/ride/[id]' as const, params: { id: String(order.id) } };
}
const terminal = new Set(['completed', 'cancelled', 'rejected']);
export default function CustomerHome() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const orders = useQuery({ queryKey: [...orderKeys.all, 'home'], queryFn: () => listCustomerOrders(1) });
  const active = orders.data?.data.find((order) => !terminal.has(order.status));
  const shortcuts = [
    { type: 'ride' as const, title: 'Ride', detail: 'Perjalanan cepat', action: () => router.push('/(customer)/ride/create') },
    { type: 'food' as const, title: 'Food', detail: cartCount ? `${cartCount} item di keranjang` : 'Kuliner lokal', action: () => router.push(cartCount ? '/(customer)/food/cart' : '/(customer)/food') },
    { type: 'send' as const, title: 'Send', detail: 'Kirim barang', action: () => router.push('/(customer)/send/create') },
  ];
  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'A';
  return <Screen>
    <PageHeader eyebrow="ANTERGO" title={`Halo, ${user?.name?.split(' ')[0] ?? 'Kamu'}!`} description="Mau ke mana hari ini?" action={<Pressable accessibilityRole="button" accessibilityLabel="Buka profil" onPress={() => router.push('/(customer)/profile')} style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></Pressable>} />
    <Pressable onPress={() => router.push('/(customer)/ride/create')} style={({ pressed }) => [styles.location, pressed && styles.pressed]}><View style={styles.locationIcon}><SymbolView name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }} size={20} tintColor={Colors.primary} /></View><View style={styles.locationCopy}><Text style={styles.locationLabel}>LOKASI KAMU</Text><Text style={styles.locationValue}>Tentukan titik jemput</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={20} tintColor={Colors.subtle} /></Pressable>
    <View style={styles.hero}><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>Satu aplikasi, banyak kebutuhan</Text><Text style={styles.heroTitle}>Jalan, makan, dan kirim jadi lebih mudah.</Text><Text style={styles.heroBody}>Layanan lokal yang siap menemani aktivitasmu.</Text></View><View style={styles.heroMark}><Text style={styles.heroMarkText}>A</Text></View></View>
    <SectionHeader title="Pilih layanan" />
    <View style={styles.services}>{shortcuts.map((item) => <Pressable key={item.type} accessibilityRole="button" onPress={item.action} style={({ pressed }) => [styles.service, pressed && styles.pressed]}><ServiceIcon type={item.type} size={54} /><Text style={styles.serviceTitle}>{item.title}</Text><Text style={styles.serviceDetail}>{item.detail}</Text></Pressable>)}</View>
    {active ? <><SectionHeader title="Pesanan aktif" action={<Pressable onPress={() => router.push('/(customer)/orders')}><Text style={styles.link}>Lihat semua</Text></Pressable>} /><Pressable onPress={() => router.push(orderPath(active))} style={({ pressed }) => pressed && styles.pressed}><Card><View style={styles.orderTop}><ServiceLabel type={active.type} /><OrderStatusBadge status={active.status} /></View><Text style={styles.orderNumber}>{active.order_number}</Text><Text numberOfLines={2} style={styles.orderAddress}>{active.destination_address ?? active.pickup_address ?? 'Detail tujuan tersedia di pesanan'}</Text><View style={styles.orderBottom}><Text style={styles.total}>{formatRupiah(active.total_price)}</Text><Text style={styles.link}>Lacak pesanan</Text></View></Card></Pressable></> : null}
    {cartCount ? <Pressable onPress={() => router.push('/(customer)/food/cart')} style={({ pressed }) => [styles.cart, pressed && styles.pressed]}><SymbolView name={{ ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' }} size={22} tintColor={Colors.white} /><Text style={styles.cartText}>{cartCount} item menunggu di keranjang</Text><Text style={styles.cartAction}>Buka</Text></Pressable> : null}
  </Screen>;
}
const styles = StyleSheet.create({ avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }, avatarText: { color: Colors.white, fontSize: 18, fontWeight: '800' }, location: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border }, locationIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft }, locationCopy: { flex: 1, gap: 2 }, locationLabel: { color: Colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: .6 }, locationValue: { color: Colors.text, ...Typography.cardTitle }, hero: { minHeight: 170, flexDirection: 'row', overflow: 'hidden', padding: Spacing.xl, borderRadius: Radius.xl, backgroundColor: Colors.primary }, heroCopy: { flex: 1, justifyContent: 'center', gap: Spacing.sm, zIndex: 1 }, heroEyebrow: { color: '#D1FAE5', ...Typography.caption }, heroTitle: { color: Colors.white, fontSize: 22, lineHeight: 28, fontWeight: '800' }, heroBody: { color: '#ECFDF5', ...Typography.metadata }, heroMark: { position: 'absolute', right: -25, bottom: -36, width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.13)' }, heroMarkText: { color: 'rgba(255,255,255,.85)', fontSize: 76, fontWeight: '900' }, services: { flexDirection: 'row', gap: Spacing.md }, service: { flex: 1, minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border }, serviceTitle: { color: Colors.text, ...Typography.cardTitle }, serviceDetail: { color: Colors.muted, fontSize: 11, lineHeight: 15, textAlign: 'center' }, pressed: { opacity: .72 }, link: { color: Colors.primaryDark, ...Typography.caption }, orderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }, orderNumber: { color: Colors.text, ...Typography.cardTitle }, orderAddress: { color: Colors.muted, ...Typography.body }, orderBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, total: { color: Colors.text, ...Typography.cardTitle }, cart: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg }, cartText: { flex: 1, color: Colors.white, ...Typography.metadata, fontWeight: '700' }, cartAction: { color: Colors.white, ...Typography.button } });
