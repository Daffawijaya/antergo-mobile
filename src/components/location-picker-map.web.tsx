import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/colors';
import type { Coordinate } from '@/lib/location';
export function LocationPickerMap({ coordinate }: { coordinate?: Coordinate; onChange: (value: Coordinate) => void }) { return <View style={styles.frame}><Text style={styles.title}>Pratinjau lokasi</Text><Text style={styles.copy}>Peta interaktif tersedia di aplikasi Android dan iOS.</Text>{coordinate ? <Text style={styles.address}>Lokasi sudah dipilih dari pencarian atau GPS.</Text> : null}</View>; }
const styles = StyleSheet.create({ frame: { flex: 1, minHeight: 340, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.xl, backgroundColor: Colors.primarySoft }, title: { color: Colors.text, ...Typography.sectionTitle }, copy: { color: Colors.muted, ...Typography.body, textAlign: 'center' }, address: { color: Colors.primaryDark, ...Typography.metadata } });
