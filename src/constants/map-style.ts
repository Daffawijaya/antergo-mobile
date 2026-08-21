export const MAP_STYLE_URLS = {
  light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

export function getMapStyleUrl(_mode?: "light" | "dark") {
  return MAP_STYLE_URLS.light;
}
