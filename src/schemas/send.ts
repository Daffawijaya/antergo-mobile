import { z } from "zod";

const coordinate = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib dipilih.`)
    .refine((value) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= min && number <= max;
    }, `${label} tidak valid.`);

export const createSendSchema = z.object({
  pickup_address: z
    .string()
    .trim()
    .min(1, "Alamat pickup wajib diisi.")
    .max(500),
  pickup_latitude: coordinate(-90, 90, "Latitude pickup"),
  pickup_longitude: coordinate(-180, 180, "Longitude pickup"),
  destination_address: z
    .string()
    .trim()
    .min(1, "Alamat tujuan wajib diisi.")
    .max(500),
  destination_latitude: coordinate(-90, 90, "Latitude tujuan"),
  destination_longitude: coordinate(-180, 180, "Longitude tujuan"),
  item_name: z
    .string()
    .trim()
    .min(2, "Nama barang minimal 2 karakter.")
    .max(150),
  item_description: z.string().trim().max(1000).optional(),
  recipient_name: z
    .string()
    .trim()
    .min(2, "Nama penerima minimal 2 karakter.")
    .max(150),
  recipient_phone: z
    .string()
    .trim()
    .min(8, "Nomor penerima minimal 8 karakter.")
    .max(30),
  notes: z.string().trim().max(500).optional(),
});

export type CreateSendForm = z.infer<typeof createSendSchema>;
