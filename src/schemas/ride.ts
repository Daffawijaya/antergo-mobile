import { z } from "zod";

function coordinate(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .refine(
      (value) =>
        Number.isFinite(Number(value)) &&
        Number(value) >= min &&
        Number(value) <= max,
      `${label} harus antara ${min} dan ${max}.`,
    );
}

export const createRideSchema = z.object({
  pickup_address: z
    .string()
    .trim()
    .min(3, "Alamat jemput minimal 3 karakter.")
    .max(500),
  pickup_latitude: coordinate("Latitude jemput", -90, 90),
  pickup_longitude: coordinate("Longitude jemput", -180, 180),
  destination_address: z
    .string()
    .trim()
    .min(3, "Alamat tujuan minimal 3 karakter.")
    .max(500),
  destination_latitude: coordinate("Latitude tujuan", -90, 90),
  destination_longitude: coordinate("Longitude tujuan", -180, 180),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter."),
});

export type CreateRideForm = z.infer<typeof createRideSchema>;
