import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

type PlaceMarkerProps = {
  label?: string;
  color?: string;
  icon?: string;
  scale?: number;
  active?: boolean;
  textPosition?: "left" | "right";
};

/**
 * Map marker styled like etamhub's UmkmMarker.
 * Pin is the anchor; text overflows to the side without shifting the pin.
 */
export function PlaceMarker({
  label,
  color = "#10B981",
  icon = "store",
  scale = 1,
  active = false,
  textPosition = "right",
}: PlaceMarkerProps) {
  const pinW = 26 * scale;
  const pinH = 32 * scale;
  const circleR = 10 * scale;
  const textColor = active ? "#C5221F" : color;
  const circleColor = active ? "#8B0000" : color;

  return (
    // Wrapper sized to pin only — anchor stays at pin tip
    <View style={{ width: pinW, height: pinH, overflow: "visible" }}>
      {/* Pin SVG */}
      <Svg width={pinW} height={pinH} viewBox="0 0 26 32" fill="none">
        <Path
          d="M13 0 C5.8 0 0 5.8 0 13 c0 6 7 14 10 16.5 a4 4 0 0 0 6 0 c3-2.5 10-10.5 10-16.5 C26 5.8 20.2 0 13 0 Z"
          fill={active ? "#EA4335" : "#FFFFFF"}
          stroke={active ? "#B71C1C" : "#E5E7EB"}
          strokeWidth={0.5}
        />
      </Svg>

      {/* Colored circle + icon */}
      <View
        style={{
          position: "absolute",
          top: 3 * scale,
          left: (pinW - circleR * 2) / 2,
          width: circleR * 2,
          height: circleR * 2,
          borderRadius: circleR,
          backgroundColor: circleColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconSvg name={icon} size={12 * scale} />
      </View>

      {/* Text label — wrapper with explicit width for proper line-breaking */}
      {label ? (
        <View
          style={{
            position: "absolute",
            top: -3,
            ...(textPosition === "right"
              ? { left: pinW + 4 }
              : { right: pinW + 4 }),
            width: 120,
            height: pinH,
            flexDirection: "row",
            justifyContent: textPosition === "left" ? "flex-end" : "flex-start",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11 * scale,
              fontWeight: "600",
              fontFamily: "Outfit_600SemiBold",
              color: textColor,
              lineHeight: 14 * scale,
              textAlign: textPosition === "left" ? "right" : "left",
              textShadowColor: "#FFFFFF",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 3,
            } as any}
            numberOfLines={2}
          >
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function IconSvg({ name, size }: { name: string; size: number }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" };
  const s = "#FFFFFF";
  const sw = 2.5;

  switch (name) {
    case "store":
      return (
        <Svg {...props}>
          <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M9 22V12h6v10" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "food":
      return (
        <Svg {...props}>
          <Path d="M18 8h1a4 4 0 010 8h-1" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6 1v3M10 1v3M14 1v3" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "shop":
      return (
        <Svg {...props}>
          <Path d="M2 7h20" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M4 7V20a2 2 0 002 2h12a2 2 0 002-2V7" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M9 22V12h6v10" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "pin":
    default:
      return (
        <Svg {...props}>
          <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="10" r="3" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
  }
}
