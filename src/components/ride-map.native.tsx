import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, {
  Marker,
  type MapPressEvent,
  type MarkerDragStartEndEvent,
} from "react-native-maps";

import { Colors, Elevation, Radius } from "@/constants/colors";
import type { Coordinate } from "@/lib/location";

type Props = {
  pickup?: Coordinate;
  destination?: Coordinate;
  driver?: Coordinate;
  onMapPress?: (coordinate: Coordinate) => void;
  onPickupChange?: (coordinate: Coordinate) => void;
  onDestinationChange?: (coordinate: Coordinate) => void;
  showsUserLocation?: boolean;
  focus?: "pickup" | "destination" | "all";
};

const JAKARTA = {
  latitude: -6.2,
  longitude: 106.816666,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function RideMap({
  pickup,
  destination,
  driver,
  onMapPress,
  onPickupChange,
  onDestinationChange,
  showsUserLocation,
  focus = "all",
}: Props) {
  const ref = useRef<MapView>(null);
  useEffect(() => {
    const coordinates =
      focus === "pickup"
        ? [driver, pickup]
        : focus === "destination"
          ? [driver, destination]
          : [pickup, destination, driver];
    const valid = coordinates.filter((item): item is Coordinate => !!item);
    if (valid.length >= 2)
      ref.current?.fitToCoordinates(valid, {
        animated: true,
        edgePadding: { top: 45, right: 45, bottom: 45, left: 45 },
      });
    else if (valid[0])
      ref.current?.animateToRegion(
        { ...valid[0], latitudeDelta: 0.025, longitudeDelta: 0.025 },
        400,
      );
  }, [destination, driver, focus, pickup]);

  const mapPress = (event: MapPressEvent) =>
    onMapPress?.(event.nativeEvent.coordinate);
  const drag =
    (callback?: (coordinate: Coordinate) => void) =>
    (event: MarkerDragStartEndEvent) =>
      callback?.(event.nativeEvent.coordinate);
  return (
    <View style={styles.frame}>
      <MapView
        ref={ref}
        style={styles.map}
        initialRegion={JAKARTA}
        onPress={mapPress}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={showsUserLocation}
      >
        {pickup ? (
          <Marker
            coordinate={pickup}
            title="Jemput"
            pinColor={Colors.primary}
            draggable={!!onPickupChange}
            onDragEnd={drag(onPickupChange)}
          />
        ) : null}
        {destination ? (
          <Marker
            coordinate={destination}
            title="Tujuan"
            pinColor={Colors.text}
            draggable={!!onDestinationChange}
            onDragEnd={drag(onDestinationChange)}
          />
        ) : null}
        {driver ? (
          <Marker
            coordinate={driver}
            title="Driver"
            pinColor={Colors.primaryDark}
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 360,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Elevation.card,
  },
  map: { flex: 1 },
});
