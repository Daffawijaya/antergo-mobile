import { AxiosError, create, isAxiosError } from 'axios';

import type { ApiErrorPayload } from '@/types/api';
import { getStoredToken, handleUnauthorized } from './session';

const baseURL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export const apiClient = create({
  baseURL,
  timeout: 15_000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401 && (await getStoredToken())) {
      await handleUnauthorized();
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown) {
  if (!baseURL) return 'EXPO_PUBLIC_API_URL belum dikonfigurasi.';
  if (!isAxiosError<ApiErrorPayload>(error)) return 'Terjadi kesalahan. Coba lagi.';
  const errors = error.response?.data?.errors;
  const firstValidationError = errors && Object.values(errors)[0]?.[0];
  return firstValidationError ?? error.response?.data?.message ??
    (error.code === 'ECONNABORTED' ? 'Server terlalu lama merespons.' : 'Tidak dapat terhubung ke server.');
}
