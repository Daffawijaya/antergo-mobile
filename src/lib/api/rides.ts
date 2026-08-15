import type {
  CancelRideResponse,
  CreateRideInput,
  CreateRideResponse,
  LaravelPaginator,
  Order,
  OrderDetailResponse,
} from "@/types/api";
import { apiClient } from "./client";

export async function createRide(input: CreateRideInput) {
  return (await apiClient.post<CreateRideResponse>("/orders", input)).data;
}

export async function listCustomerOrders(page = 1) {
  return (
    await apiClient.get<LaravelPaginator<Order>>("/orders", {
      params: { page },
    })
  ).data;
}

export async function getOrderDetail(id: number) {
  return (await apiClient.get<OrderDetailResponse>(`/orders/${id}`)).data.order;
}

export async function cancelRide(id: number, cancelledReason?: string) {
  return (
    await apiClient.post<CancelRideResponse>(`/orders/${id}/cancel`, {
      cancelled_reason: cancelledReason?.trim() || null,
    })
  ).data;
}
