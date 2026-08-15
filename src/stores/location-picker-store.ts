import { create } from "zustand";
import type { Coordinate } from "@/lib/location";
export type LocationPurpose =
  | "ride-pickup"
  | "ride-destination"
  | "send-pickup"
  | "send-destination"
  | "food-destination";
export type PickedLocation = { coordinate: Coordinate; address: string };
type State = {
  selections: Partial<Record<LocationPurpose, PickedLocation>>;
  setSelection: (purpose: LocationPurpose, value: PickedLocation) => void;
  clearSelection: (purpose: LocationPurpose) => void;
};
export const useLocationPickerStore = create<State>((set) => ({
  selections: {},
  setSelection: (purpose, value) =>
    set((state) => ({ selections: { ...state.selections, [purpose]: value } })),
  clearSelection: (purpose) =>
    set((state) => {
      const selections = { ...state.selections };
      delete selections[purpose];
      return { selections };
    }),
}));
