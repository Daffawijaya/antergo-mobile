import { StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';
import type { OrderStatus } from '@/types/api';

const LABELS: Record<OrderStatus, string> = {
  pending: 'Menunggu konfirmasi',
  searching_driver: 'Mencari driver',
  driver_assigned: 'Driver ditemukan',
  driver_arrived: 'Driver telah tiba',
  merchant_confirmed: 'Dikonfirmasi merchant',
  preparing: 'Sedang disiapkan',
  ready_for_pickup: 'Siap diambil',
  picked_up: 'Sudah diambil',
  in_progress: 'Perjalanan berlangsung',
  delivering: 'Sedang diantar',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const terminal = status === 'completed' || status === 'cancelled';
  return <Text style={[styles.badge, terminal && styles.terminal]}>{LABELS[status]}</Text>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, overflow: 'hidden', backgroundColor: Colors.primarySoft, color: Colors.primary, fontWeight: '800', fontSize: 13 },
  terminal: { backgroundColor: '#EEF1F0', color: Colors.muted },
});
