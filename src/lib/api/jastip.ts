import { apiClient } from "./client";

export interface JastipItem {
  name: string;
  quantity?: string;
  unit?: string;
  price?: string;
  note?: string;
}

export interface JastipLocation {
  place_name: string;
  address: string;
  latitude: number;
  longitude: number;
  items: JastipItem[];
}

export interface CreateJastipPayload {
  purchase_locations: JastipLocation[];
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  advance_amount: number;
  driver_note?: string;
}

export async function createJastipOrder(payload: CreateJastipPayload) {
  return (await apiClient.post("/jastip/orders", payload)).data;
}
