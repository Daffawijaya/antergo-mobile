import { apiClient } from "./client";

export interface TitipBeliItem {
  name: string;
  quantity?: string;
  note?: string;
}

export interface TitipBeliLocation {
  place_name: string;
  address: string;
  latitude: number;
  longitude: number;
  items: TitipBeliItem[];
}

export interface CreateTitipBeliPayload {
  purchase_locations: TitipBeliLocation[];
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  advance_amount: number;
  driver_note?: string;
}

export async function createTitipBeliOrder(payload: CreateTitipBeliPayload) {
  return (await apiClient.post("/titip-beli/orders", payload)).data;
}
