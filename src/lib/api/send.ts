import type {
  CreateSendInput,
  CreateSendResponse,
  DriverSendStatusUpdate,
  Order,
} from "@/types/api";
import { apiClient } from "./client";

export async function createSend(input: CreateSendInput) {
  return (await apiClient.post<CreateSendResponse>("/send/orders", input)).data;
}

export async function getSendDetail(orderId: number) {
  return (await apiClient.get<{ order: Order }>(`/orders/${orderId}`)).data
    .order;
}

export async function updateSendStatus(
  orderId: number,
  status: DriverSendStatusUpdate,
) {
  return (
    await apiClient.post<{ message: string; order: Order }>(
      `/driver/orders/${orderId}/status`,
      { status },
    )
  ).data.order;
}
