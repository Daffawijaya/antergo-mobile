import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Button, Card, FormField, KeyValue } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { getApiErrorMessage } from '@/lib/api/client';
import { submitOrderRating } from '@/lib/api/payment-rating';
import type { Order, RatingTarget } from '@/types/api';

export function RatingCard({ order, queryKey }: { order: Order; queryKey: readonly unknown[] }) {
  const client = useQueryClient();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const defaultTarget: RatingTarget = order.type === 'ride' ? 'driver' : 'merchant';
  const [target, setTarget] = useState<RatingTarget>(defaultTarget);
  const mutation = useMutation({
    mutationFn: () => submitOrderRating(order.id, { target, rating: score, comment: comment.trim() || null }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey }); },
  });

  if (order.status !== 'completed') return null;
  if (order.payment_status !== 'paid') return <Card><Text style={styles.title}>Penilaian</Text><Text style={styles.body}>Penilaian tersedia setelah driver mengonfirmasi pembayaran tunai.</Text></Card>;
  if (order.rating) return <Card>
    <Text style={styles.title}>Penilaian Anda</Text>
    <KeyValue label="Target" value={order.rating.driver_id ? 'Driver' : 'Merchant'} />
    <Text style={styles.stars}>{'★'.repeat(order.rating.rating)}{'☆'.repeat(5 - order.rating.rating)}</Text>
    {order.rating.comment ? <Text style={styles.body}>{order.rating.comment}</Text> : null}
  </Card>;

  return <Card>
    <Text style={styles.title}>Beri Penilaian</Text>
    {order.type === 'food' ? <View style={styles.targets}>
      <Button title="Merchant" variant={target === 'merchant' ? 'primary' : 'secondary'} onPress={() => setTarget('merchant')} />
      <Button title="Driver" variant={target === 'driver' ? 'primary' : 'secondary'} onPress={() => setTarget('driver')} />
    </View> : null}
    <View style={styles.starRow}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} bintang`} onPress={() => setScore(value)}><Text style={[styles.star, value <= score && styles.starActive]}>★</Text></Pressable>)}</View>
    <FormField label="Komentar (opsional)" value={comment} onChangeText={setComment} multiline numberOfLines={3} maxLength={1000} />
    {score === 0 ? <Text style={styles.hint}>Pilih 1 sampai 5 bintang.</Text> : null}
    {mutation.isError ? <Text style={styles.error}>{getApiErrorMessage(mutation.error)}</Text> : null}
    <Button title="Kirim Penilaian" disabled={score === 0} loading={mutation.isPending} onPress={() => mutation.mutate()} />
  </Card>;
}

const styles = StyleSheet.create({
  title: { color: Colors.text, fontSize: 18, fontWeight: '800' }, body: { color: Colors.text, lineHeight: 20 },
  targets: { gap: 8 }, starRow: { flexDirection: 'row', gap: 8 }, star: { color: Colors.border, fontSize: 38 }, starActive: { color: '#F59E0B' }, stars: { color: '#F59E0B', fontSize: 26 },
  hint: { color: Colors.muted }, error: { color: Colors.danger, lineHeight: 20 },
});
