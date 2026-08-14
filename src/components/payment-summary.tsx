import { StyleSheet, Text } from 'react-native';

import { Card, KeyValue } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { formatDateTime, formatRupiah } from '@/lib/format';
import type { Order } from '@/types/api';

export function PaymentSummary({ order }: { order: Order }) {
  const paid = order.payment_status === 'paid';
  return <Card>
    <Text style={styles.title}>Pembayaran</Text>
    <KeyValue label="Metode" value={order.payment_method === 'cash' ? 'Tunai' : order.payment_method} />
    <KeyValue label="Status" value={paid ? 'Lunas' : 'Belum Dibayar'} />
    <KeyValue label="Total" value={formatRupiah(order.payment?.amount ?? order.total_price)} />
    {order.payment?.paid_at ? <KeyValue label="Diterima pada" value={formatDateTime(order.payment.paid_at)} /> : null}
  </Card>;
}

const styles = StyleSheet.create({ title: { color: Colors.text, fontSize: 18, fontWeight: '800' } });
