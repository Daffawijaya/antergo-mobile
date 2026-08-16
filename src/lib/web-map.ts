import type * as Leaflet from "leaflet";

export type LeafletModule = typeof import("leaflet");

// Esri World Street Map — free basemap tiles that closely resemble the
// Google Maps look. Requires attribution (kept via attributionControl).
export const ESRI_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
export const TILE_ATTRIBUTION =
  "&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

// Google-Maps-style teardrop pin built as an inline SVG, so no image assets
// are needed and it renders anywhere Leaflet's divIcon does.
const PIN_SVG = (color: string): string => `<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
<path d="M16 0C7.16 0 0 7.16 0 16c0 12.04 13.16 24 16 24s16-11.96 16-24C32 7.16 24.84 0 16 0Z" fill="${color}" stroke="#FFFFFF" stroke-width="2.5"/>
<circle cx="16" cy="15" r="7" fill="#FFFFFF"/>
</svg>`;

export const makePinIcon = (
  L: LeafletModule,
  color: string,
): Leaflet.DivIcon =>
  L.divIcon({
    className: "",
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    html: PIN_SVG(color),
  });
