import {
  Camera,
  type CameraRef,
  Layer,
  Map,
  RasterSource,
  type ViewStateChangeEvent,
} from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type NativeSyntheticEvent } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Colors } from "@/constants/colors";
import type { Coordinate } from "@/lib/location";
import { useAppTheme } from "@/stores/theme-store";

const DEFAULT_COORDINATE: Coordinate = {
  latitude: -0.5022,
  longitude: 117.1536,
};

const BASE_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#E9ECEF" },
    },
  ],
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
  const rasterStyle = useMemo(
    () =>
      mode === "dark"
        ? {
            rasterBrightnessMin: 0.04,
            rasterBrightnessMax: 0.42,
            rasterSaturation: -0.72,
            rasterContrast: 0.18,
            rasterHueRotate: 205,
          }
        : {
            rasterBrightnessMin: 0,
            rasterBrightnessMax: 1,
            rasterSaturation: 0,
            rasterContrast: 0,
            rasterHueRotate: 0,
          },
    [mode],
  );

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
    <View className="flex-1 overflow-hidden">
      <Map
        mapStyle={BASE_STYLE}
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
        <RasterSource
          id="osm"
          tiles={["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]}
          tileSize={256}
          maxzoom={19}
          attribution="© OpenStreetMap contributors"
        >
          <Layer id="osm-raster" type="raster" style={rasterStyle} />
        </RasterSource>
      </Map>
      <View
        pointerEvents="none"
        className="absolute left-1/2 top-1/2 -ml-6 -mt-14 items-center"
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand elevation-lg">
          <AppIcon name="pin" size={29} color={Colors.onPrimary} />
        </View>
        <View className="h-3 w-1 rounded-full bg-brand" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});