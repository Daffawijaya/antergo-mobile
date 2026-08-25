import {
  Camera,
  Map,
  Marker,
} from "@maplibre/maplibre-react-native";
import { StyleSheet, View } from "react-native";

import { LocationPickerMarker } from "@/components/brand-icons";
import { getMapStyleUrl } from "@/constants/map-style";
import type { Coordinate } from "@/lib/location";
import { useAppTheme } from "@/stores/theme-store";

/** Static, non-interactive map thumbnail with a centered pin. */
export function MapPreview({ coordinate }: { coordinate: Coordinate }) {
  const { mode } = useAppTheme();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Map
        mapStyle={getMapStyleUrl(mode)}
        style={StyleSheet.absoluteFill}
        compass={false}
        logo={false}
        attribution={false}
        pointerEvents="none"
      >
        <Camera
          initialViewState={{
            center: [coordinate.longitude, coordinate.latitude],
            zoom: 16,
          }}
        />
        <Marker
          id="map-preview-pin"
          lngLat={[coordinate.longitude, coordinate.latitude]}
          anchor="bottom"
        >
          <LocationPickerMarker size={34} holeColor="#FFFFFF" />
        </Marker>
      </Map>
    </View>
  );
}
