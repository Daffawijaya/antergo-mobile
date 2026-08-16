import type { Coordinate } from "@/lib/location";
import { apiClient } from "./client";

export type ApiSearchResult = {
  coordinate: Coordinate;
  name: string;
  address: string;
  distance: number | null;
  source?: "merchant" | "geoapify" | "nominatim";
};

export async function apiSearchLocations(
  query: string,
  reference?: Coordinate,
): Promise<ApiSearchResult[]> {
  const { data } = await apiClient.get<{ data: ApiSearchResult[] }>("/geocode", {
    params: {
      q: query,
      limit: 6,
      ...(reference
        ? { lat: reference.latitude, lon: reference.longitude }
        : {}),
    },
  });
  return data.data ?? [];
}
