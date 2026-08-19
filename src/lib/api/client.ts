import { Platform } from "react-native";
import { AxiosError, create, isAxiosError } from "axios";
import Constants from "expo-constants";
import type { ApiErrorPayload } from "@/types/api";
import { getStoredToken, handleUnauthorized } from "./session";

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const hostUri = Constants.expoConfig?.hostUri;

  // 1. Explicit override (Production/Force)
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  // 2. Development Logic
  if (__DEV__) {
    if (Platform.OS === "web") {
      return "http://localhost:8000/api";
    }
    if (hostUri) {
      const metroHost = hostUri.split(":")[0];
      return `http://${metroHost}:8000/api`;
    }
    if (Platform.OS === "android") {
      return "http://10.0.2.2:8000/api";
    }
  }

  throw new Error("API URL tidak dapat ditentukan.");
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
