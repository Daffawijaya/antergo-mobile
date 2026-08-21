import { useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

type WarmGradientBgProps = {
  /** Total height of the gradient area (default: 500) */
  height?: number;
  /** Override SVG props if needed */
  style?: object;
};

/**
 * Reusable warm golden → white top-right radial glow background.
 */
export function WarmGradientBg({ height = 500, style }: WarmGradientBgProps) {
  const { width } = useWindowDimensions();

  return (
    <Svg
      width={width}
      height={height}
      style={[{ position: "absolute", top: 0, left: 0 }, style]}
    >
      <Defs>
        <RadialGradient
          id="warm-gradient"
          cx={width}
          cy={0}
          rx={width * 1.15}
          ry={height * 0.45}
          fx={width}
          fy={0}
          gradientUnits="userSpaceOnUse"
        >
          {/* Pojok Kanan Atas: Oranye Keemasan Pekat */}
          <Stop offset="0" stopColor="#f79100" />
          <Stop offset="0.12" stopColor="#fa9f12" />

          {/* Pendaran Amber & Gold */}
          <Stop offset="0.25" stopColor="#ffb834" />
          <Stop offset="0.40" stopColor="#ffd670" />

          {/* Transisi Krem Hangat */}
          <Stop offset="0.58" stopColor="#ffecc2" />
          <Stop offset="0.75" stopColor="#fff8e7" />
          <Stop offset="0.90" stopColor="#fffdfa" />

          {/* Latar Putih Bersih */}
          <Stop offset="1" stopColor="#ffffff" />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#warm-gradient)" />
    </Svg>
  );
}
