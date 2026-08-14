import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LaravelPaginator, NotificationHistory } from '@/types/api';
import { apiClient } from './client';

export const STORED_PUSH_TOKEN_KEY = 'antergo_expo_push_token';

export async function registerPushToken(token: string, platform: 'android' | 'ios') {
  await apiClient.post('/push-tokens', { token, platform });
  await AsyncStorage.setItem(STORED_PUSH_TOKEN_KEY, token);
}

export async function unregisterStoredPushToken() {
  const token = await AsyncStorage.getItem(STORED_PUSH_TOKEN_KEY);
  if (!token) return;
  try { await apiClient.delete('/push-tokens', { data: { token } }); }
  finally { await AsyncStorage.removeItem(STORED_PUSH_TOKEN_KEY); }
}

export async function clearStoredPushToken() {
  await AsyncStorage.removeItem(STORED_PUSH_TOKEN_KEY);
}

export async function listNotificationHistory(page = 1) {
  return (await apiClient.get<LaravelPaginator<NotificationHistory>>('/notifications', { params: { page } })).data;
}
