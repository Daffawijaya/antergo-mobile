import { isAxiosError } from "axios";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { updateDriverLocation } from "@/lib/api/driver-rides";

export const DRIVER_BACKGROUND_LOCATION_TASK =
  "ANTERGO_DRIVER_BACKGROUND_LOCATION";

const TRACKING_MODE_KEY = "antergo_driver_tracking_mode";
const LOCATION_DISTANCE_METERS = 25;
const LOCATION_INTERVAL_MS = 15_000;
export type DriverTrackingMode = "stopped" | "foreground" | "background";
let backgroundRequestInFlight = false;

async function readTrackingMode(): Promise<DriverTrackingMode> {
  if (Platform.OS === "web") return "stopped";
  return (
    ((await SecureStore.getItemAsync(
      TRACKING_MODE_KEY,
    )) as DriverTrackingMode | null) ?? "stopped"
  );
}

export async function setDriverTrackingMode(mode: DriverTrackingMode) {
  if (Platform.OS !== "web")
    await SecureStore.setItemAsync(TRACKING_MODE_KEY, mode);
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  DRIVER_BACKGROUND_LOCATION_TASK,
  async ({ data, error }) => {
    if (
      error ||
      backgroundRequestInFlight ||
      (await readTrackingMode()) !== "background"
    )
      return;
    const location = data?.locations.at(-1);
    if (!location) return;
    backgroundRequestInFlight = true;
    try {
      await updateDriverLocation(location);
    } catch (requestError) {
      if (isAxiosError(requestError) && requestError.response?.status === 401)
        await stopDriverLocationTracking();
    } finally {
      backgroundRequestInFlight = false;
    }
  },
);

export async function startDriverBackgroundTracking() {
  if (Platform.OS === "web")
    throw new Error("Background location tidak tersedia di web.");
  if (!(await TaskManager.isAvailableAsync()))
    throw new Error(
      "Background tracking memerlukan Expo Development Build di perangkat fisik.",
    );
  if (
    await Location.hasStartedLocationUpdatesAsync(
      DRIVER_BACKGROUND_LOCATION_TASK,
    )
  )
    return;
  await Location.startLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: LOCATION_DISTANCE_METERS,
    timeInterval: LOCATION_INTERVAL_MS,
    deferredUpdatesDistance: LOCATION_DISTANCE_METERS,
    deferredUpdatesInterval: LOCATION_INTERVAL_MS,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.AutomotiveNavigation,
    foregroundService: {
      notificationTitle: "AnterGo Driver aktif",
      notificationBody:
        "AnterGo sedang menggunakan lokasi untuk menerima dan menjalankan pesanan.",
      killServiceOnDestroy: false,
    },
  });
}

export async function stopDriverLocationTracking() {
  await setDriverTrackingMode("stopped");
  if (Platform.OS === "web" || !(await TaskManager.isAvailableAsync())) return;
  if (
    await Location.hasStartedLocationUpdatesAsync(
      DRIVER_BACKGROUND_LOCATION_TASK,
    )
  ) {
    await Location.stopLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK);
  }
}
