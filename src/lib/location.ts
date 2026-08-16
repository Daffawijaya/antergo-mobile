import * as Location from "expo-location";
import { Platform } from "react-native";

export type Coordinate = { latitude: number; longitude: number };

export type SearchResult = {
  coordinate: Coordinate;
  name: string;
  address: string;
};

// expo-location does not support reverse geocoding on web, so web builds
// use Nominatim (OpenStreetMap) instead — free, no API key, Indonesian labels.
async function webReverseGeocode(coordinate: Coordinate): Promise<string | null> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(coordinate.latitude),
    lon: String(coordinate.longitude),
    "accept-language": "id",
    zoom: "18",
    addressdetails: "1",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) return null;
  const data = await response.json();
  const address: Record<string, string> = data?.address ?? {};
  const road = address.road ?? address.pedestrian ?? address.footway;
  const area = address.neighbourhood ?? address.suburb ?? address.quarter;
  const city =
    address.city ?? address.town ?? address.village ?? address.municipality;
  const state = address.state ?? address.region;
  const name =
    typeof data?.name === "string" && data.name.trim()
      ? data.name.trim()
      : "";
  if (road) {
    const parts = [road, area, city].filter(Boolean);
    return parts.join(", ");
  }
  if (name) return name;
  if (area) return `dekat ${area}`;
  if (city) return city;
  if (state) return state;
  return null;
}

// expo-location's geocodeAsync is Android/iOS only and often misses Indonesian
// place names, so searches use Nominatim (OpenStreetMap) — free, no API key.
async function webSearchLocations(
  query: string,
  limit = 6,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": "id",
    countrycodes: "id",
    limit: String(limit),
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) return [];
  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];
  const results: SearchResult[] = [];
  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const latitude = Number(record.lat);
    const longitude = Number(record.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const displayName =
      typeof record.display_name === "string"
        ? record.display_name.trim()
        : "";
    const name =
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : (displayName.split(",")[0]?.trim() ?? query);
    // Drop the leading name from the address so the list row isn't redundant.
    const address = displayName
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && part.toLowerCase() !== name.toLowerCase())
      .join(", ");
    results.push({
      coordinate: { latitude, longitude },
      name,
      address: address || displayName,
    });
  }
  return results;
}

export async function searchLocations(
  query: string,
  limit = 6,
): Promise<SearchResult[]> {
  const value = query.trim();
  if (!value) return [];
  if (Platform.OS === "web") return webSearchLocations(value, limit);
  try {
    const matches = await Location.geocodeAsync(value);
    if (matches.length) {
      return Promise.all(
        matches.slice(0, limit).map(async ({ latitude, longitude }) => {
          const coordinate = { latitude, longitude };
          const address = await reverseGeocodeLabel(coordinate);
          return { coordinate, name: address.split(",")[0], address };
        }),
      );
    }
  } catch {
    // Platform geocoder unavailable (e.g. no location permission on Android) —
    // fall back to OpenStreetMap.
  }
  return webSearchLocations(value, limit);
}

export class LocationUnavailableError extends Error {}
export class LocationPermissionError extends Error {}
export class BackgroundLocationPermissionError extends LocationPermissionError {}

export async function getLastKnownCoordinate(): Promise<Coordinate | undefined> {
  try {
    const location = await Location.getLastKnownPositionAsync();
    return location ? coordinateFromLocation(location) : undefined;
  } catch {
    return undefined;
  }
}

export async function requestCurrentLocation(): Promise<Location.LocationObject> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled)
    throw new LocationUnavailableError(
      "Layanan lokasi/GPS sedang tidak aktif. Aktifkan GPS lalu coba lagi.",
    );
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new LocationPermissionError(
      "Izin lokasi ditolak. Izinkan lokasi foreground untuk menggunakan fitur ini.",
    );
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
}

export async function requestDriverTrackingPermissions() {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled)
    throw new LocationUnavailableError(
      "Layanan lokasi/GPS sedang tidak aktif. Aktifkan GPS lalu coba lagi.",
    );
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted)
    throw new LocationPermissionError(
      "Izin lokasi foreground diperlukan agar driver dapat Online.",
    );
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted)
    throw new BackgroundLocationPermissionError(
      "Izin lokasi background diperlukan agar pesanan tetap menerima posisi saat layar mati atau aplikasi tidak dibuka.",
    );
}
export function coordinateFromLocation(
  location: Location.LocationObject,
): Coordinate {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export function coordinateLabel(coordinate: Coordinate) {
  return `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
}

export async function reverseGeocodeLabel(coordinate: Coordinate) {
  if (Platform.OS === "web") {
    const webLabel = await webReverseGeocode(coordinate).catch(() => null);
    if (webLabel) return webLabel;
  }
  try {
    const [address] = await Location.reverseGeocodeAsync(coordinate);
    if (!address) return coordinateLabel(coordinate);
    return (
      address.formattedAddress ||
      [
        address.name,
        address.street,
        address.district,
        address.city,
        address.region,
        address.postalCode,
      ]
        .filter(Boolean)
        .filter((value, index, all) => all.indexOf(value) === index)
        .join(", ") ||
      coordinateLabel(coordinate)
    );
  } catch {
    return coordinateLabel(coordinate);
  }
}

export function parseCoordinate(
  latitude?: string | null,
  longitude?: string | null,
): Coordinate | undefined {
  const parsed = { latitude: Number(latitude), longitude: Number(longitude) };
  return Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)
    ? parsed
    : undefined;
}

export function distanceMeters(a: Coordinate, b: Coordinate) {
  const radius = 6_371_000;
  const lat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const lon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x =
    Math.sin(lat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(lon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
