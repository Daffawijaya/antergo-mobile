import type {
  DriverDocumentStatus,
  DriverDocumentType,
  VehicleType,
} from "@/types/api";

export const SIM_FOR_VEHICLE: Record<VehicleType, DriverDocumentType> = {
  motorcycle: "sim_c",
  car: "sim_a",
};

export const DOC_LABELS: Record<DriverDocumentType, string> = {
  ktp: "KTP",
  sim_a: "SIM A",
  sim_c: "SIM C",
};

export function isDateExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dateStr}T00:00:00`).getTime() < today.getTime();
}

export function documentIsExpired(
  docs: DriverDocumentStatus[] | undefined,
  type: DriverDocumentType,
): boolean {
  return isDateExpired(docs?.find((d) => d.type === type)?.expires_at);
}

export function vehicleSimExpired(
  docs: DriverDocumentStatus[] | undefined,
  vehicleType: VehicleType,
): boolean {
  return documentIsExpired(docs, SIM_FOR_VEHICLE[vehicleType]);
}
