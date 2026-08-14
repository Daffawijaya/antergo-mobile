export const Colors = {
  primary: "#10B981",
  primaryPressed: "#059669",
  primaryDark: "#047857",
  primarySoft: "#ECFDF5",
  background: "#F5F7F6",
  surface: "#FFFFFF",
  surfaceMuted: "#F9FAFB",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  warning: "#D97706",
  warningSoft: "#FFFBEB",
  success: "#16A34A",
  successSoft: "#F0FDF4",
  info: "#2563EB",
  infoSoft: "#EFF6FF",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;
export const Radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;
export const Typography = {
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800" as const,
    fontFamily: "Outfit_800ExtraBold",
  },
  pageTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800" as const,
    fontFamily: "Outfit_800ExtraBold",
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800" as const,
    fontFamily: "Outfit_800ExtraBold",
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700" as const,
    fontFamily: "Outfit_700Bold",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
    fontFamily: "Outfit_400Regular",
  },
  metadata: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
    fontFamily: "Outfit_500Medium",
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
    fontFamily: "Outfit_600SemiBold",
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800" as const,
    fontFamily: "Outfit_800ExtraBold",
  },
} as const;

export const Elevation = {
  card: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;
