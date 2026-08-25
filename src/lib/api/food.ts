import type {
  CreateFoodOrderInput,
  FoodOrderResponse,
  LaravelPaginator,
  Merchant,
  Order,
  Product,
} from "@/types/api";
import { apiClient } from "./client";
export type CommerceService = "food" | "shopping";
const productType = (service: CommerceService) =>
  service === "shopping" ? "goods" : "food";
export async function listMerchants(
  page = 1,
  service: CommerceService = "food",
) {
  return (
    await apiClient.get<LaravelPaginator<Merchant>>("/merchants", {
      params: { page, product_type: productType(service) },
    })
  ).data;
}
export async function getMerchantDetail(
  id: number,
  service: CommerceService = "food",
) {
  return (
    await apiClient.get<{ merchant: Merchant }>(`/merchants/${id}`, {
      params: { product_type: productType(service) },
    })
  ).data.merchant;
}
export async function listProducts(
  merchantId: number,
  search?: string,
  service: CommerceService = "food",
) {
  return (
    await apiClient.get<LaravelPaginator<Product>>("/products", {
      params: {
        merchant_id: merchantId,
        search: search || undefined,
        product_type: productType(service),
      },
    })
  ).data;
}
export async function listNearbyProducts(
  page = 1,
  search?: string,
  productType?: "food" | "goods",
) {
  return (
    await apiClient.get<LaravelPaginator<Product>>("/products", {
      params: { page, search: search || undefined, product_type: productType },
    })
  ).data;
}
export async function createFoodOrder(input: CreateFoodOrderInput) {
  const endpoint =
    input.service_type === "shopping" ? "/shopping/orders" : "/food/orders";
  return (await apiClient.post<FoodOrderResponse>(endpoint, input)).data;
}
export async function getFoodOrderDetail(id: number) {
  return (await apiClient.get<{ order: Order }>(`/orders/${id}`)).data.order;
}
export async function payWithMidtrans(orderId: number) {
  const { data } = await apiClient.post<{ redirect_url: string }>(
    `/orders/${orderId}/pay`,
  );
  return data.redirect_url;
}
export async function listMerchantOrders(page = 1) {
  return (
    await apiClient.get<LaravelPaginator<Order>>("/merchant/orders", {
      params: { page },
    })
  ).data;
}
export async function confirmMerchantOrder(id: number) {
  return (
    await apiClient.post<{ message: string; order: Order }>(
      `/merchant/orders/${id}/confirm`,
    )
  ).data.order;
}
export async function updateMerchantOrderStatus(
  id: number,
  status: "preparing" | "ready_for_pickup",
) {
  return (
    await apiClient.post<{ message: string; order: Order }>(
      `/merchant/orders/${id}/status`,
      { status },
    )
  ).data.order;
}
