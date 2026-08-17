import { AxiosError, create, isAxiosError } from "axios";
import Constants from "expo-constants";
import type { ApiErrorPayload } from "@/types/api";
import { getStoredToken, handleUnauthorized } from "./session";

const getBaseUrl = () => {
  if (__DEV__) {
    // Detect IP automatically
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(":")[0];
      console.log(`[API] Using development base URL: http://${ip}:8000/api`);
      return `http://${ip}:8000/api`;
    }
  }
  return process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
};

const baseURL = getBaseUrl();

export const apiClient = create({
  baseURL,
  timeout: 15_000,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.log(`[API] Request: ${config.method?.toUpperCase()} ${baseURL}${config.url}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError<ApiErrorPayload>) => {
    console.log(`[API] Error: ${error.message} | URL: ${error.config?.url}`);
    if (error.response?.status === 401 && (await getStoredToken())) {
      await handleUnauthorized();
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown) {
  if (!baseURL) return "API URL belum dikonfigurasi.";
  if (!isAxiosError<ApiErrorPayload>(error))
    return "Terjadi kesalahan. Coba lagi.";
  const errors = error.response?.data?.errors;
  const firstValidationError = errors && Object.values(errors)[0]?.[0];
  return (
    firstValidationError ??
    error.response?.data?.message ??
    (error.code === "ECONNABORTED"
      ? "Server terlalu lama merespons."
      : "Tidak dapat terhubung ke server.")
  );
}
