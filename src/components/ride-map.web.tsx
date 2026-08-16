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

const JAKARTA: [number, number] = [-6.2, 106.816666];

// Leaflet must not be evaluated during the static (Node) render of web
// exports — it touches `window` at module scope. Lazy import keeps it
// browser-only (inside effects), so SSR never loads it.
let leafletPromise: Promise<LeafletModule> | null = null;
const loadLeaflet = (): Promise<LeafletModule> =>
  (leafletPromise ??= import("leaflet"));

const toLatLng = (c: Coordinate): [number, number] => [
  c.latitude,
  c.longitude,
];

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
  const hostRef = useRef<View>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const markersRef = useRef<{
    pickup?: Leaflet.Marker;
    destination?: Leaflet.Marker;
    driver?: Leaflet.Marker;
    user?: Leaflet.Marker;
  }>({});
  const handlersRef = useRef({ onMapPress, onPickupChange, onDestinationChange });
  handlersRef.current = { onMapPress, onPickupChange, onDestinationChange };
  const [mapTick, bumpMapTick] = useReducer((v: number) => v + 1, 0);

  useEffect(() => {
    let disposed = false;
    let map: Leaflet.Map | null = null;
    void loadLeaflet().then((L) => {
      if (disposed) return;
      const el = hostRef.current as unknown as HTMLElement;
      if (!el) return;
      map = L.map(el, { zoomControl: false, minZoom: 10 }).setView(JAKARTA, 13);
      L.tileLayer(ESRI_TILES, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (event: Leaflet.LeafletMouseEvent) =>
        handlersRef.current.onMapPress?.({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        }),
      );
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
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    const markers = markersRef.current;
    const sync = (
      key: "pickup" | "destination" | "driver",
      coordinate: Coordinate | undefined,
      color: string,
      draggable: boolean,
      onDragEnd: ((c: Coordinate) => void) | undefined,
    ) => {
      const existing = markers[key];
      if (coordinate) {
        if (!existing) {
          const created = L.marker(toLatLng(coordinate), {
            icon: makePinIcon(L, color),
            draggable,
            zIndexOffset: key === "driver" ? 500 : 1000,
          }).addTo(map);
          markers[key] = created;
          if (draggable && onDragEnd) {
            const emit = onDragEnd;
            created.on("dragend", () => {
              const latlng = created.getLatLng();
              emit({ latitude: latlng.lat, longitude: latlng.lng });
            });
          }
        } else {
          existing.setLatLng(toLatLng(coordinate));
          if (draggable) existing.dragging?.enable();
          else existing.dragging?.disable();
        }
      } else if (existing) {
        map.removeLayer(existing);
        markers[key] = undefined;
      }
    };
    sync("pickup", pickup, Colors.primary, !!onPickupChange, onPickupChange);
    sync(
      "destination",
      destination,
      Colors.text,
      !!onDestinationChange,
      onDestinationChange,
    );
    sync("driver", driver, Colors.info, false, undefined);
  }, [pickup, destination, driver, onPickupChange, onDestinationChange, mapTick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const coordinates =
      focus === "pickup"
        ? [driver, pickup]
        : focus === "destination"
          ? [driver, destination]
          : [pickup, destination, driver];
    const valid = coordinates.filter((item): item is Coordinate => !!item);
    if (valid.length >= 2)
      map.fitBounds(valid.map(toLatLng), { padding: [45, 45] });
    else if (valid[0])
      map.setView(toLatLng(valid[0]), Math.max(map.getZoom(), 15));
  }, [pickup, destination, driver, focus, mapTick]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !showsUserLocation) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const currentMap = mapRef.current;
        if (!currentMap) return;
        const coordinate: Coordinate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (!markersRef.current.user)
          markersRef.current.user = L.marker(toLatLng(coordinate), {
            icon: makePinIcon(L, Colors.info),
            zIndexOffset: 1500,
          }).addTo(currentMap);
        else markersRef.current.user.setLatLng(toLatLng(coordinate));
      },
      undefined,
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [showsUserLocation, mapTick]);

  return <View ref={hostRef} style={styles.frame} />;
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
});
