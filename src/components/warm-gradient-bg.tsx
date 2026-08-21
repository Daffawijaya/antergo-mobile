import { useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useAppTheme } from "@/stores/theme-store";

type WarmGradientBgProps = {
  /** Total height of the gradient area (default: 500) */
  height?: number;
  /** Override SVG props if needed */
  style?: object;
};

/** Light: warm golden → white top-right radial glow.
 *  Dark: muted warm amber → dark background (inverted logic). */
export function WarmGradientBg({ height = 500, style }: WarmGradientBgProps) {
  const { width } = useWindowDimensions();
  const { mode } = useAppTheme();
  const isDark = mode === "dark";

  return (
    <Svg
      width={width}
      height={height}
      style={[{ position: "absolute", top: 0, left: 0 }, style]}
    >
      <Defs>
        {/* Light mode: warm golden → white */}
        <RadialGradient
          id="warm-light"
          cx={width}
          cy={0}
          rx={width * 1.15}
          ry={height * 0.45}
          fx={width}
          fy={0}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#f79100" />
          <Stop offset="0.12" stopColor="#fa9f12" />
          <Stop offset="0.25" stopColor="#ffb834" />
          <Stop offset="0.40" stopColor="#ffd670" />
          <Stop offset="0.58" stopColor="#ffecc2" />
          <Stop offset="0.75" stopColor="#fff8e7" />
          <Stop offset="0.90" stopColor="#fffdfa" />
          <Stop offset="1" stopColor="#ffffff" />
        </RadialGradient>
        {/* Dark mode: muted warm amber → dark background */}
        <RadialGradient
          id="warm-dark"
          cx={width}
          cy={0}
          rx={width * 1.15}
          ry={height * 0.45}
          fx={width}
          fy={0}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#8B5500" />
          <Stop offset="0.12" stopColor="#7A4B00" />
          <Stop offset="0.25" stopColor="#6B4200" />
          <Stop offset="0.40" stopColor="#5A3800" />
          <Stop offset="0.58" stopColor="#3D2600" />
          <Stop offset="0.75" stopColor="#2A1B00" />
          <Stop offset="0.90" stopColor="#1E1400" />
          <Stop offset="1" stopColor="#121313" />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill={isDark ? "url(#warm-dark)" : "url(#warm-light)"} />
    </Svg>
  );
}
