import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/colors';
import type { Order } from '@/types/api';
type ServiceType = Order['type'];
const service = {
  ride: { label: 'Ride', icon: { ios: 'motorcycle.fill', android: 'two_wheeler', web: 'two_wheeler' } },
  food: { label: 'Food', icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' } },
  send: { label: 'Send', icon: { ios: 'shippingbox.fill', android: 'package_2', web: 'package_2' } },
} as const;
export function ServiceIcon({ type, size = 46 }: { type: ServiceType; size?: number }) { return <View style={[styles.icon, { width: size, height: size, borderRadius: size / 2 }]}><SymbolView name={service[type].icon} size={size * .46} tintColor={Colors.primary} /></View>; }
export function ServiceLabel({ type }: { type: ServiceType }) { return <View style={styles.label}><ServiceIcon type={type} size={24} /><Text style={styles.labelText}>{service[type].label}</Text></View>; }
const styles = StyleSheet.create({ icon: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft }, label: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceMuted, paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.pill }, labelText: { color: Colors.text, ...Typography.caption } });
