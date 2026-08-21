import { create } from "zustand";
import {
  coordinateFromLocation,
  getLastKnownCoordinate,
  requestCurrentLocation,
  reverseGeocodeLabel,
  type Coordinate,
} from "@/lib/location";

export type LocationPurpose =
  | "ride-pickup"
  | "ride-destination"
  | "send-pickup"
  | "send-destination"
  | "jastip-purchase"
  | "jastip-destination"
  | "food-destination";

export type PickedLocation = { coordinate: Coordinate; address: string };

type State = {
  selections: Partial<Record<LocationPurpose, PickedLocation>>;
  // The user's current location, refreshed whenever a create screen opens (or
  // the app starts) so the pickup always starts from where the user really is.
  currentLocation: PickedLocation | null;
  setSelection: (purpose: LocationPurpose, value: PickedLocation) => void;
  clearSelection: (purpose: LocationPurpose) => void;
  // Fetches a fresh GPS fix (falling back to the last known position), stores
  // it as currentLocation and returns it. Concurrent callers share the same
  // in-flight fetch instead of double-firing the GPS prompt.
  refreshCurrentLocation: () => Promise<PickedLocation | null>;
};

// Shared across callers: the startup capture and a create screen opening at
// the same time reuse one fetch instead of two.
let inflight: Promise<PickedLocation | null> | null = null;

async function fetchFreshLocation(): Promise<PickedLocation | null> {
  try {
    let point: Coordinate | undefined;
    try {
      // Prefer a fresh fix — "lokasi terkini" — and only fall back to the
      // cached position when GPS is unavailable or denied.
      point = coordinateFromLocation(await requestCurrentLocation());
    } catch {
      point = await getLastKnownCoordinate();
    }
    if (!point) return null;
    const address = await reverseGeocodeLabel(point);
    return { coordinate: point, address };
  } catch {
    return null;
  }
}

export const useLocationPickerStore = create<State>((set) => {
  return {
    selections: {},
    currentLocation: null,
    setSelection: (purpose, value) =>
      set((state) => ({ selections: { ...state.selections, [purpose]: value } })),
    clearSelection: (purpose) =>
      set((state) => {
        const selections = { ...state.selections };
        delete selections[purpose];
        return { selections };
      }),
    refreshCurrentLocation: () => {
      if (!inflight) {
        inflight = (async () => {
          try {
            const point = await fetchFreshLocation();
            if (point) set({ currentLocation: point });
            return point;
          } finally {
            inflight = null;
          }
        })();
      }
      return inflight;
    },
  };
});
