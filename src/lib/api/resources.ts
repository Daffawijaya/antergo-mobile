import type { Driver, LaravelPaginator, Merchant, Order } from '@/types/api';
import { apiClient } from './client';

export const getDriverProfile = async () =>
  (await apiClient.get<{ driver: Driver }>('/driver/profile')).data.driver;

export const setDriverOnline = async (online: boolean) =>
  (await apiClient.post<{ driver: Driver }>(`/driver/${online ? 'online' : 'offline'}`)).data.driver;

export const getMerchantProfile = async () =>
  (await apiClient.get<{ merchant: Merchant }>('/merchant/me')).data.merchant;

export const setMerchantOpen = async (open: boolean) =>
  (await apiClient.post<{ merchant: Merchant }>(`/merchant/${open ? 'open' : 'close'}`)).data.merchant;

export const getCustomerOrders = async () =>
  (await apiClient.get<LaravelPaginator<Order>>('/orders')).data;

export const getDriverOrders = async () => ({
  data: (await apiClient.get<{ orders: Order[] }>('/driver/orders/available')).data.orders,
});

export const getMerchantOrders = async () =>
  (await apiClient.get<LaravelPaginator<Order>>('/merchant/orders')).data;
