import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { type Region } from "react-native-maps";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/colors";
import type { Coordinate } from "@/lib/location";
const DEFAULT_REGION = {
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
  useEffect(() => {
    if (coordinate)
      ref.current?.animateToRegion(
        { ...coordinate, latitudeDelta: 0.018, longitudeDelta: 0.018 },
        350,
      );
  }, [coordinate]);
  const changed = (region: Region) =>
    onChange({ latitude: region.latitude, longitude: region.longitude });
  return (
    <View className="flex-1">
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={
          coordinate
            ? { ...coordinate, latitudeDelta: 0.018, longitudeDelta: 0.018 }
            : DEFAULT_REGION
        }
        showsUserLocation
        onRegionChangeComplete={changed}
      />
      <View
        pointerEvents="none"
        className="absolute left-1/2 top-1/2 -ml-6 -mt-14 items-center"
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand elevation-lg">
          <SymbolView
            name={{
              ios: "location.fill",
              android: "location_on",
              web: "location_on",
            }}
            size={29}
            tintColor={Colors.white}
          />
        </View>
        <View className="h-3 w-1 rounded-full bg-brand" />
      </View>
    </View>
  );
}
