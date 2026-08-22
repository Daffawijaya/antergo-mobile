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
  mapModal: {
    animation: "none",
    presentation: "transparentModal",
    contentStyle: { backgroundColor: "transparent" },
  },
} as const;
