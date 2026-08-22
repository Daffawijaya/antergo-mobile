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

export type NearbyMerchant = {
  id: number;
  name: string;
  coordinate: Coordinate;
  distance: number;
  category_id: number | null;
};

export type MapBounds = {
  sw: Coordinate;
  ne: Coordinate;
};

export async function apiNearbyMerchants(
  bounds: MapBounds,
  limit = 25,
): Promise<NearbyMerchant[]> {
  const { data } = await apiClient.get<{ data: NearbyMerchant[] }>(
    "/geocode/merchants-nearby",
    {
      params: {
        sw_lat: bounds.sw.latitude,
        sw_lon: bounds.sw.longitude,
        ne_lat: bounds.ne.latitude,
        ne_lon: bounds.ne.longitude,
        limit,
      },
    },
  );
  return data.data ?? [];
}

export async function apiNearbyPlaces(
  coordinate: Coordinate,
  limit = 10,
): Promise<ApiSearchResult[]> {
  const { data } = await apiClient.get<{ data: ApiSearchResult[] }>(
    "/geocode/nearby",
    {
      params: {
        lat: coordinate.latitude,
        lon: coordinate.longitude,
        limit,
      },
    },
  );
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
