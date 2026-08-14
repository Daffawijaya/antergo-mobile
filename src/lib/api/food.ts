import type { CreateFoodOrderInput, FoodOrderResponse, LaravelPaginator, Merchant, Order, Product } from '@/types/api';
import { apiClient } from './client';

export async function listMerchants(page = 1) {
  return (await apiClient.get<LaravelPaginator<Merchant>>('/merchants', { params: { page } })).data;
}
export async function getMerchantDetail(id: number) {
  return (await apiClient.get<{ merchant: Merchant }>(`/merchants/${id}`)).data.merchant;
}
export async function listProducts(merchantId: number, search?: string) {
  return (await apiClient.get<LaravelPaginator<Product>>('/products', { params: { merchant_id: merchantId, search: search || undefined } })).data;
}
export async function createFoodOrder(input: CreateFoodOrderInput) {
  return (await apiClient.post<FoodOrderResponse>('/food/orders', input)).data;
}
export async function getFoodOrderDetail(id: number) {
  return (await apiClient.get<{ order: Order }>(`/orders/${id}`)).data.order;
}
export async function listMerchantOrders(page = 1) {
  return (await apiClient.get<LaravelPaginator<Order>>('/merchant/orders', { params: { page } })).data;
}
export async function confirmMerchantOrder(id: number) {
  return (await apiClient.post<{ message: string; order: Order }>(`/merchant/orders/${id}/confirm`)).data.order;
}
export async function updateMerchantOrderStatus(id: number, status: 'preparing' | 'ready_for_pickup') {
  return (await apiClient.post<{ message: string; order: Order }>(`/merchant/orders/${id}/status`, { status })).data.order;
}
