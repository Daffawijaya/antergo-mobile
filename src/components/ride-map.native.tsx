import {
  Camera,
  type CameraRef,
  Layer,
  Map,
  type MapProps,
  Marker,
  RasterSource,
  UserLocation,
} from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Colors, Elevation, Radius } from "@/constants/colors";
import type { Coordinate } from "@/lib/location";
import { useAppTheme } from "@/stores/theme-store";

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

export function RideMap({
  pickup,
  destination,
  driver,
  onMapPress,
  showsUserLocation,
  focus = "all",
}: Props) {
  const camera = useRef<CameraRef>(null);
  const { mode } = useAppTheme();
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
    const coordinates =
      focus === "pickup"
        ? [driver, pickup]
        : focus === "destination"
          ? [driver, destination]
          : [pickup, destination, driver];
    const valid = coordinates.filter((item): item is Coordinate => !!item);
    if (valid.length >= 2) {
      const longitudes = valid.map((item) => item.longitude);
      const latitudes = valid.map((item) => item.latitude);
      camera.current?.fitBounds(
        [
          Math.min(...longitudes),
          Math.min(...latitudes),
          Math.max(...longitudes),
          Math.max(...latitudes),
        ],
        { padding: { top: 45, right: 45, bottom: 45, left: 45 }, duration: 400 },
      );
    } else if (valid[0]) {
      camera.current?.easeTo({
        center: [valid[0].longitude, valid[0].latitude],
        zoom: 15,
        duration: 400,
      });
    }
  }, [destination, driver, focus, pickup]);

  const mapPress: NonNullable<MapProps["onPress"]> = (event) => {
    const [longitude, latitude] = event.nativeEvent.lngLat;
    onMapPress?.({ latitude, longitude });
  };

  return (
    <View style={styles.frame}>
      <Map
        mapStyle={BASE_STYLE}
        style={styles.map}
        compass={false}
        logo={false}
        attribution
        onPress={mapPress}
      >
        <Camera
          ref={camera}
          initialViewState={{
            center: [
              (pickup ?? destination ?? driver ?? DEFAULT_COORDINATE).longitude,
              (pickup ?? destination ?? driver ?? DEFAULT_COORDINATE).latitude,
            ],
            zoom: 14,
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
        {pickup ? <MapPin id="pickup" coordinate={pickup} color={Colors.primary} /> : null}
        {destination ? <MapPin id="destination" coordinate={destination} color="#FA2C19" /> : null}
        {driver ? <MapPin id="driver" coordinate={driver} color={Colors.primaryDark} icon="bike" /> : null}
        {showsUserLocation ? <UserLocation /> : null}
      </Map>
    </View>
  );
}

function MapPin({
  id,
  coordinate,
  color,
  icon = "pin",
}: {
  id: string;
  coordinate: Coordinate;
  color: string;
  icon?: "pin" | "bike";
}) {
  return (
    <Marker id={id} lngLat={[coordinate.longitude, coordinate.latitude]} anchor="bottom">
      <View style={[styles.marker, { backgroundColor: color }]}>
        <AppIcon name={icon} size={18} color="#FFFFFF" />
      </View>
    </Marker>
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
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4,
  },
});