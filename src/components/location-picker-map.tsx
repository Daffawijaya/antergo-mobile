import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { type Region } from "react-native-maps";
import { LocationPickerMarker } from "@/components/brand-icons";
import { Elevation, Radius } from "@/constants/colors";
import type { Coordinate } from "@/lib/location";
import { useAppTheme } from "@/stores/theme-store";
const JAKARTA = {
  latitude: -6.2,
  longitude: 106.816666,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};
export function LocationPickerMap({
  coordinate,
  onChange,
}: {
  coordinate?: Coordinate;
  onChange: (value: Coordinate) => void;
}) {
  const ref = useRef<MapView>(null);
  const userMovedMap = useRef(false);
  const { mode } = useAppTheme();
  useEffect(() => {
    if (coordinate)
      ref.current?.animateToRegion(
        { ...coordinate, latitudeDelta: 0.018, longitudeDelta: 0.018 },
        350,
      );
  }, [coordinate]);
  const changed = (region: Region, details?: { isGesture?: boolean }) => {
    // Android also fires this callback when initialRegion/animateToRegion
    // positions the map. Treating that as a user move reverse-geocodes the
    // selected POI and replaces names such as "Big Mall" with its street.
    const isUserMove = details?.isGesture === true || userMovedMap.current;
    userMovedMap.current = false;
    if (!isUserMove) return;

    onChange({ latitude: region.latitude, longitude: region.longitude });
  };
  return (
    <View style={styles.frame}>
      <MapView
        ref={ref}
        style={styles.map}
        initialRegion={
          coordinate
            ? { ...coordinate, latitudeDelta: 0.018, longitudeDelta: 0.018 }
            : JAKARTA
        }
        showsUserLocation
        onPanDrag={() => {
          userMovedMap.current = true;
        }}
        onRegionChangeComplete={changed}
      />
      <View pointerEvents="none" style={styles.pin}>
        <LocationPickerMarker
          size={40}
          holeColor={mode === "dark" ? "#1F1400" : "#FFFFFF"}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 380,
    overflow: "hidden",
    borderRadius: Radius.xl,
    ...Elevation.card,
  },
  map: { flex: 1 },
  pin: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -20,
    marginTop: -38,
    alignItems: "center",
  },
});
