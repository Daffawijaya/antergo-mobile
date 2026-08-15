import type { Order, Rating, RatingTarget } from "@/types/api";
import { apiClient } from "./client";

export async function settleCashPayment(orderId: number) {
  return (
    await apiClient.post<{ message: string; order: Order }>(
      `/driver/orders/${orderId}/payments/cash/settle`,
    )
  ).data.order;
}

export async function submitOrderRating(
  orderId: number,
  input: { target: RatingTarget; rating: number; comment?: string | null },
) {
  return (
    await apiClient.post<{ message: string; rating: Rating }>(
      `/orders/${orderId}/rating`,
      input,
    )
  ).data.rating;
}
