import {
  Camera,
  type CameraRef,
  Map,
  type ViewStateChangeEvent,
} from "@maplibre/maplibre-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type NativeSyntheticEvent } from "react-native";

import { LocationPickerMarker } from "@/components/brand-icons";
import { getMapStyleUrl } from "@/constants/map-style";
import type { Coordinate } from "@/lib/location";
import { useAppTheme } from "@/stores/theme-store";

const DEFAULT_COORDINATE: Coordinate = {
  latitude: -0.5022,
  longitude: 117.1536,
};

export function LocationPickerMap({
  coordinate,
  onChange,
}: {
  coordinate?: Coordinate;
  onChange: (value: Coordinate) => void;
}) {
  const camera = useRef<CameraRef>(null);
  const { mode } = useAppTheme();
  const [initial] = useState(() => coordinate ?? DEFAULT_COORDINATE);
  useEffect(() => {
    if (!coordinate) return;
    camera.current?.easeTo({
      center: [coordinate.longitude, coordinate.latitude],
      duration: 350,
    });
  }, [coordinate]);

  const regionChanged = (
    event: NativeSyntheticEvent<ViewStateChangeEvent>,
  ) => {
    if (!event.nativeEvent.userInteraction) return;
    const [longitude, latitude] = event.nativeEvent.center;
    onChange({ latitude, longitude });
  };

  return (
    <View style={styles.container}>
      <Map
        mapStyle={getMapStyleUrl(mode)}
        style={styles.map}
        compass={false}
        logo={false}
        attribution
        onRegionDidChange={regionChanged}
      >
        <Camera
          ref={camera}
          initialViewState={{
            center: [initial.longitude, initial.latitude],
            zoom: 16,
          }}
        />
      </Map>
      <View
        pointerEvents="none"
        style={styles.centerPin}
      >
        <LocationPickerMarker
          size={40}
          holeColor={mode === "dark" ? "#1F1400" : "#FFFFFF"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 1, overflow: "hidden" },
  map: { flex: 1 },
  centerPin: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -20,
    marginTop: -38,
    alignItems: "center",
  },
});