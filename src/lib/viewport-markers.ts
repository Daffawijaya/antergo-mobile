import type { Coordinate } from "./location";

export type PlaceData = {
  id: string | number;
  coordinate: Coordinate;
  name: string;
  color?: string;
  icon?: string;
};

type Bounds = {
  sw: Coordinate;
  ne: Coordinate;
};

/**
 * Filter markers so they spread evenly across the visible viewport.
 *
 * - Low zoom (zoomed out) → fewer markers, grid-based dedup
 * - High zoom (zoomed in) → more markers
 * - Max zoom → all markers shown
 *
 * Algorithm: divide the viewport into a grid. Each cell keeps only the
 * marker closest to its center. Grid resolution grows with zoom level.
 */
export function filterViewportMarkers(
  places: PlaceData[],
  bounds: Bounds,
  zoom: number,
): PlaceData[] {
  if (!places.length) return places;

  // At max zoom show everything
  if (zoom >= 18) return places;

  // Target number of markers per axis grows with zoom.
  // zoom 12 → ~3 per axis (9 total), zoom 14 → ~4 (16), zoom 16 → ~6 (36)
  const perAxis = Math.max(2, Math.round(1 + (zoom - 10) * 0.7));
  const maxMarkers = perAxis * perAxis;

  // If we already have fewer markers than the budget, return all
  if (places.length <= maxMarkers) return places;

  const latSpan = bounds.ne.latitude - bounds.sw.latitude;
  const lonSpan = bounds.ne.longitude - bounds.sw.longitude;

  // Expand bounds by 10 % so markers near edges aren't cut off
  const padLat = latSpan * 0.1;
  const padLon = lonSpan * 0.1;
  const minLat = bounds.sw.latitude - padLat;
  const maxLat = bounds.ne.latitude + padLat;
  const minLon = bounds.sw.longitude - padLon;
  const maxLon = bounds.ne.longitude + padLon;

  const cellH = (maxLat - minLat) / perAxis;
  const cellW = (maxLon - minLon) / perAxis;

  // Grid of perAxis × perAxis cells; each cell stores the best marker
  const grid: (PlaceData | null)[][] = Array.from({ length: perAxis }, () =>
    Array.from({ length: perAxis }, () => null),
  );
  const gridDist: number[][] = Array.from({ length: perAxis }, () =>
    Array.from({ length: perAxis }, () => Infinity),
  );

  for (const place of places) {
    const { latitude: lat, longitude: lon } = place.coordinate;

    // Skip markers outside expanded bounds
    if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) continue;

    const row = Math.min(Math.floor((lat - minLat) / cellH), perAxis - 1);
    const col = Math.min(Math.floor((lon - minLon) / cellW), perAxis - 1);

    // Cell center
    const centerLat = minLat + (row + 0.5) * cellH;
    const centerLon = minLon + (col + 0.5) * cellW;

    const dist =
      (lat - centerLat) ** 2 / (latSpan * latSpan) +
      (lon - centerLon) ** 2 / (lonSpan * lonSpan);

    if (dist < gridDist[row][col]) {
      gridDist[row][col] = dist;
      grid[row][col] = place;
    }
  }

  const result: PlaceData[] = [];
  for (const row of grid) {
    for (const cell of row) {
      if (cell) result.push(cell);
    }
  }

  return result;
}
