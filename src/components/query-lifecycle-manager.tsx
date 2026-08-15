import { focusManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

export function QueryLifecycleManager() {
  useEffect(() => {
    if (Platform.OS === "web") {
      const updateFocus = () => focusManager.setFocused(!document.hidden);
      document.addEventListener("visibilitychange", updateFocus);
      updateFocus();
      return () => document.removeEventListener("visibilitychange", updateFocus);
    }

    const updateFocus = (status: AppStateStatus) => {
      focusManager.setFocused(status === "active");
    };
    const subscription = AppState.addEventListener("change", updateFocus);
    updateFocus(AppState.currentState);
    return () => subscription.remove();
  }, []);

  return null;
}