import {
  Camera,
  type CameraRef,
  Map,
  Marker,
  type ViewStateChangeEvent,
} from "@maplibre/maplibre-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type NativeSyntheticEvent } from "react-native";

import { LocationPickerMarker } from "@/components/brand-icons";
import { PlaceMarker } from "@/components/place-marker";
import { Colors } from "@/constants/colors";
import { getMapStyleUrl } from "@/constants/map-style";
import type { Coordinate } from "@/lib/location";
import { useAppTheme } from "@/stores/theme-store";

export type PlaceData = {
  id: string | number;
  coordinate: Coordinate;
  name: string;
  color?: string;
  icon?: string;
};

const DEFAULT_COORDINATE: Coordinate = {
  latitude: -0.5022,
  longitude: 117.1536,
};

export type RegionBounds = {
  sw: Coordinate;
  ne: Coordinate;
};

export function LocationPickerMap({
  coordinate,
  onChange,
  onRegionChange,
  onZoomChange,
  places,
  onPlacePress,
}: {
  coordinate?: Coordinate;
  onChange: (value: Coordinate) => void;
  onRegionChange?: (bounds: RegionBounds) => void;
  onZoomChange?: (zoom: number) => void;
  places?: PlaceData[];
  onPlacePress?: (place: PlaceData) => void;
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
    const [longitude, latitude] = event.nativeEvent.center;
    const zoom = typeof event.nativeEvent.zoom === "number" ? event.nativeEvent.zoom : 16;
    // Calculate approximate bounds from center + zoom
    const halfLatDelta = 0.003 * Math.pow(2, 18 - zoom);
    const halfLonDelta = halfLatDelta * 1.5;
    const sw: Coordinate = {
      latitude: latitude - halfLatDelta,
      longitude: longitude - halfLonDelta,
    };
    const ne: Coordinate = {
      latitude: latitude + halfLatDelta,
      longitude: longitude + halfLonDelta,
    };
    if (event.nativeEvent.userInteraction) {
      onChange({ latitude, longitude });
    }
    onRegionChange?.({ sw, ne });
    onZoomChange?.(zoom);
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
        {places?.map((place, index) => (
          <Marker
            key={place.id}
            id={`picker-place-${place.id}`}
            lngLat={[place.coordinate.longitude, place.coordinate.latitude]}
            anchor="bottom"
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