import { Platform } from "react-native";

export const screenTransitions = {
  push: {
    animation: Platform.OS === "ios" ? "simple_push" : "slide_from_right",
    animationDuration: 220,
    presentation: "card",
  },
  overlayPush: {
    animation: "slide_from_right",
    animationDuration: 220,
    presentation: "transparentModal",
  },
  slideFromBottom: {
    animation: "slide_from_bottom",
    animationDuration: 300,
    presentation: "card",
  },
  modal: {
    animation: "slide_from_bottom",
    animationDuration: 220,
    presentation: "transparentModal",
  },
  slideDown: {
    animation: "none",
    presentation: "transparentModal",
    contentStyle: { backgroundColor: "transparent" },
  },
  none: {
    animation: "none",
  },
  // animation "none": transisi buka/tutup ditangani animasi sendiri di
  // location-picker (native-stack "fade" tidak reliable untuk kasus ini).
  mapModal: {
    animation: "none",
    presentation: "transparentModal",
    contentStyle: { backgroundColor: "transparent" },
  },
} as const;
