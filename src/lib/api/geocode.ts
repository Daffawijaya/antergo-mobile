import type { Coordinate } from "@/lib/location";
import { apiClient } from "./client";

export type ApiSearchResult = {
  coordinate: Coordinate;
  name: string;
  address: string;
  distance: number | null;
  source?: "merchant" | "geoapify" | "nominatim" | "nearby";
};

export async function apiSearchLocations(
  query: string,
  reference?: Coordinate,
): Promise<ApiSearchResult[]> {
  const { data } = await apiClient.get<{ data: ApiSearchResult[] }>("/geocode", {
    params: {
      q: query,
      limit: 10,
      ...(reference
        ? { lat: reference.latitude, lon: reference.longitude }
        : {}),
    },
  });
  return data.data ?? [];
}

export type ApiReverseGeocodeResult = {
  coordinate: Coordinate;
  name: string;
  address: string;
  source?: "geoapify" | "nominatim";
};

export async function apiReverseGeocode(
  coordinate: Coordinate,
): Promise<ApiReverseGeocodeResult | null> {
  const { data } = await apiClient.get<{
    data: ApiReverseGeocodeResult | null;
  }>("/geocode/reverse", {
    params: { lat: coordinate.latitude, lon: coordinate.longitude },
  });
  return data.data ?? null;
}
