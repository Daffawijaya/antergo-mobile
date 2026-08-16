import { useEffect, useReducer, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

import { Colors, Elevation, Radius } from "@/constants/colors";
import type { Coordinate } from "@/lib/location";
import {
  ESRI_TILES,
  makePinIcon,
  TILE_ATTRIBUTION,
  type LeafletModule,
} from "@/lib/web-map";

const JAKARTA: [number, number] = [-6.2, 106.816666];

// Leaflet must not be evaluated during the static (Node) render of web
// exports — it touches `window` at module scope. Lazy import keeps it
// browser-only (inside effects), so SSR never loads it.
let leafletPromise: Promise<LeafletModule> | null = null;
const loadLeaflet = (): Promise<LeafletModule> =>
  (leafletPromise ??= import("leaflet"));

export function LocationPickerMap({
  coordinate,
  onChange,
}: {
  coordinate?: Coordinate;
  onChange: (value: Coordinate) => void;
}) {
  const hostRef = useRef<View>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialRef = useRef(coordinate);
  const [mapTick, bumpMapTick] = useReducer((v: number) => v + 1, 0);

  useEffect(() => {
    let disposed = false;
    let map: Leaflet.Map | null = null;
    void loadLeaflet().then((L) => {
      if (disposed) return;
      const el = hostRef.current as unknown as HTMLElement;
      if (!el) return;
      const initial = initialRef.current;
      const center = initial ?? {
        latitude: JAKARTA[0],
        longitude: JAKARTA[1],
      };
      map = L.map(el, { zoomControl: false, minZoom: 10 }).setView(
        [center.latitude, center.longitude],
        14,
      );
      L.tileLayer(ESRI_TILES, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);
      const marker = L.marker([center.latitude, center.longitude], {
        icon: makePinIcon(L, Colors.primary),
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(map);
      marker.on("dragend", () => {
        const latlng = marker.getLatLng();
        onChangeRef.current({ latitude: latlng.lat, longitude: latlng.lng });
      });
      // Tapping anywhere on the map moves the marker there too.
      map.on("click", (event: Leaflet.LeafletMouseEvent) => {
        marker.setLatLng(event.latlng);
        onChangeRef.current({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      });
      markerRef.current = marker;
      mapRef.current = map;
      leafletRef.current = L;
      observerRef.current = new ResizeObserver(() => map?.invalidateSize());
      observerRef.current.observe(el);
      bumpMapTick();
    });
    return () => {
      disposed = true;
      observerRef.current?.disconnect();
      observerRef.current = null;
      map?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!coordinate || !map || !marker) return;
    marker.setLatLng([coordinate.latitude, coordinate.longitude]);
    map.flyTo(
      [coordinate.latitude, coordinate.longitude],
      Math.max(map.getZoom(), 14),
      { duration: 0.5 },
    );
  }, [coordinate, mapTick]);

  return <View ref={hostRef} style={styles.frame} />;
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 380,
    overflow: "hidden",
    borderRadius: Radius.xl,
    ...Elevation.card,
  },
});
