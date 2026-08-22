import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { LocationPickerMarker } from "@/components/brand-icons";
import { PlaceMarker } from "@/components/place-marker";
import { Colors, Elevation, Radius } from "@/constants/colors";
import type { Coordinate } from "@/lib/location";
import { useAppTheme } from "@/stores/theme-store";

export type PlaceData = {
  id: string | number;
  coordinate: Coordinate;
  name: string;
  color?: string;
  icon?: string;
};
const JAKARTA = {
  latitude: -6.2,
  longitude: 106.816666,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};
export type RegionBounds = {
  sw: Coordinate;
  ne: Coordinate;
};

export function LocationPickerMap({
  coordinate,
  onChange,
  onRegionChange,
  places,
  onPlacePress,
}: {
  coordinate?: Coordinate;
  onChange: (value: Coordinate) => void;
  onRegionChange?: (bounds: RegionBounds) => void;
  places?: PlaceData[];
  onPlacePress?: (place: PlaceData) => void;
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
    // Calculate approximate bounds from region
    const halfLat = region.latitudeDelta / 2;
    const halfLon = region.longitudeDelta / 2;
    const sw: Coordinate = {
      latitude: region.latitude - halfLat,
      longitude: region.longitude - halfLon,
    };
    const ne: Coordinate = {
      latitude: region.latitude + halfLat,
      longitude: region.longitude + halfLon,
    };
    onRegionChange?.({ sw, ne });

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
      {places?.map((place, index) => (
        <Marker
          key={place.id}
          coordinate={place.coordinate}
          tracksViewChanges={false}
          onPress={() => onPlacePress?.(place)}
        >
          <PlaceMarker
            label={place.name}
            color={place.color ?? Colors.primary}
            icon={place.icon ?? "store"}
            scale={0.85}
            textPosition={index % 2 === 0 ? "right" : "left"}
          />
        </Marker>
      ))}
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
