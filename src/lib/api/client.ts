import { Platform } from "react-native";
import { AxiosError, create, isAxiosError } from "axios";
import Constants from "expo-constants";
import type { ApiErrorPayload } from "@/types/api";
import { getStoredToken, handleUnauthorized } from "./session";

const getBaseUrl = () => {

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const hostUri = Constants.expoConfig?.hostUri;

  console.log("[API DEBUG] --- API Configuration ---");
  console.log(`[API DEBUG] __DEV__: ${__DEV__}`);
  console.log(`[API DEBUG] Platform: ${Platform.OS}`);
  console.log(`[API DEBUG] EXPO_PUBLIC_API_URL: ${envUrl}`);
  console.log(`[API DEBUG] Expo hostUri: ${hostUri}`);

  // 1. Explicit override (Production/Force)
  if (envUrl) {
    console.log(`[API DEBUG] Using EXPO_PUBLIC_API_URL: ${envUrl}`);
    return envUrl.replace(/\/$/, "");
  }

  // 2. Development Logic
  if (__DEV__) {
    // A. Web Local Development
    if (Platform.OS === "web") {
      console.log(`[API DEBUG] Detected web development, using: http://localhost:8000/api`);
      return "http://localhost:8000/api";
    }

    // B. Native (Android/iOS) Development via Metro Host
    if (hostUri) {
      const metroHost = hostUri.split(":")[0];
      const url = `http://${metroHost}:8000/api`;
      console.log(`[API DEBUG] Detected native development URL: ${url}`);
      return url;
    }

    // C. Fallback for Android Emulator only
    if (Platform.OS === "android") {
      console.warn("[API DEBUG] Could not detect host, defaulting to 10.0.2.2 for Android Emulator");
      return "http://10.0.2.2:8000/api";
    }
  }

  // Fallback if nothing else matches
  throw new Error("API URL tidak dapat ditentukan. Pastikan EXPO_PUBLIC_API_URL di-set atau jalankan di lingkungan pengembangan yang benar.");
};

const baseURL = getBaseUrl();
console.log(`[API DEBUG] Final baseURL: ${baseURL}`);

export const apiClient = create({
  baseURL,
  timeout: 15_000,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.log(
    `[API] Request: ${config.method?.toUpperCase()} ${baseURL}${config.url}`,
  );
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
