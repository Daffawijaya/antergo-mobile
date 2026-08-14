import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { SymbolView } from 'expo-symbols';
import { Colors, Elevation, Radius } from '@/constants/colors';
import type { Coordinate } from '@/lib/location';
const JAKARTA = { latitude: -6.2, longitude: 106.816666, latitudeDelta: .025, longitudeDelta: .025 };
export function LocationPickerMap({ coordinate, onChange }: { coordinate?: Coordinate; onChange: (value: Coordinate) => void }) {
 const ref = useRef<MapView>(null); useEffect(() => { if (coordinate) ref.current?.animateToRegion({ ...coordinate, latitudeDelta: .018, longitudeDelta: .018 }, 350); }, [coordinate]);
 const changed = (region: Region) => onChange({ latitude: region.latitude, longitude: region.longitude });
 return <View style={styles.frame}><MapView ref={ref} style={styles.map} initialRegion={coordinate ? { ...coordinate, latitudeDelta: .018, longitudeDelta: .018 } : JAKARTA} showsUserLocation onRegionChangeComplete={changed} /><View pointerEvents="none" style={styles.pin}><View style={styles.pinBubble}><SymbolView name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }} size={28} tintColor={Colors.white} /></View><View style={styles.tip} /></View></View>;
}
const styles = StyleSheet.create({ frame: { flex: 1, minHeight: 380, overflow: 'hidden', borderRadius: Radius.xl, ...Elevation.card }, map: { flex: 1 }, pin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -24, marginTop: -52, alignItems: 'center' }, pinBubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, ...Elevation.floating }, tip: { width: 4, height: 12, borderRadius: 2, backgroundColor: Colors.primary } });
