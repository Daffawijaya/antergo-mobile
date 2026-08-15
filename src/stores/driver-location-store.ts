import { create } from "zustand";

export type DriverLocationState =
  | "idle"
  | "requesting"
  | "locating"
  | "foreground"
  | "background"
  | "permission_required"
  | "unavailable"
  | "error";

type Store = {
  status: DriverLocationState;
  message: string | null;
  setLocationState: (
    status: DriverLocationState,
    message?: string | null,
  ) => void;
};

export const useDriverLocationStore = create<Store>((set) => ({
  status: "idle",
  message: null,
  setLocationState: (status, message = null) => set({ status, message }),
}));
