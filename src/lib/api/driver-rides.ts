import type { LocationObject } from 'expo-location';
import type { Driver, DriverFoodStatusUpdate, DriverRideStatusUpdate, LaravelPaginator, Order } from '@/types/api';
import { apiClient } from './client';

export async function getDriverProfile() {
  return (await apiClient.get<{ driver: Driver }>('/driver/profile')).data.driver;
}

export async function setDriverAvailability(online: boolean) {
  return (await apiClient.post<{ message: string; driver: Driver }>(`/driver/${online ? 'online' : 'offline'}`)).data.driver;
}

export async function updateDriverLocation(location: LocationObject) {
  return (await apiClient.post<{ message: string; location: Driver['location'] }>('/driver/location', {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    heading: location.coords.heading,
    speed: location.coords.speed,
  })).data.location;
}

export async function listAvailableRides() {
  return (await apiClient.get<{ orders: Order[] }>('/driver/orders/available')).data.orders;
}

export async function acceptRide(orderId: number) {
  return (await apiClient.post<{ message: string; order: Order }>(`/driver/orders/${orderId}/accept`)).data.order;
}

export async function getActiveRide() {
  return (await apiClient.get<{ order: Order | null }>('/driver/orders/active')).data.order;
}

export async function getDriverRideDetail(orderId: number) {
  return (await apiClient.get<{ order: Order }>(`/orders/${orderId}`)).data.order;
}

export async function updateRideStatus(orderId: number, status: DriverRideStatusUpdate) {
  return (await apiClient.post<{ message: string; order: Order }>(`/driver/orders/${orderId}/status`, { status })).data.order;
}


export async function updateFoodDeliveryStatus(orderId: number, status: DriverFoodStatusUpdate) {
  return (await apiClient.post<{ message: string; order: Order }>(`/driver/orders/${orderId}/status`, { status })).data.order;
}
export async function listDriverRideHistory(page = 1) {
  return (await apiClient.get<LaravelPaginator<Order>>('/driver/orders/history', { params: { page } })).data;
}
