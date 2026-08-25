import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import type { Coordinate } from "@/lib/location";

/** Static, non-interactive map thumbnail with a centered pin. */
export function MapPreview({ coordinate }: { coordinate: Coordinate }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        initialRegion={{
          ...coordinate,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Marker coordinate={coordinate} tracksViewChanges={false} />
      </MapView>
    </View>
  );
}
