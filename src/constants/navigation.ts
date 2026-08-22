import { Platform } from "react-native";

export const screenTransitions = {
  push: {
    animation: Platform.OS === "ios" ? "simple_push" : "slide_from_right",
    animationDuration: 220,
  },
  overlayPush: {
    animation: "slide_from_right",
    animationDuration: 220,
    presentation: "transparentModal",
  },
  modal: {
    animation: Platform.OS === "ios" ? "simple_push" : "slide_from_right",
    animationDuration: 220,
  },
  none: {
    animation: "none",
  },
} as const;