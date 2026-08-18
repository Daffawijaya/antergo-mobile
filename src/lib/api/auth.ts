import type { ImagePickerAsset } from "expo-image-picker";
import type { AuthResponse, MeResponse } from "@/types/api";
import { appendPhoto, optimizePhoto } from "@/lib/image-upload";
import { apiClient } from "./client";

export type LoginInput = { email: string; password: string };
export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
};
export type UpdateProfileInput = { name: string; email: string; phone: string };

export async function login(input: LoginInput) {
  return (await apiClient.post<AuthResponse>("/auth/login", input)).data;
}

export async function register(input: RegisterInput) {
  return (await apiClient.post<AuthResponse>("/auth/register", input)).data;
}

export async function getMe() {
  return (await apiClient.get<MeResponse>("/auth/me")).data.user;
}

export async function updateProfile(input: UpdateProfileInput) {
  return (await apiClient.patch<MeResponse>("/auth/me", input)).data.user;
}

export async function updateCustomerPhoto(asset: ImagePickerAsset) {
  const photo = await optimizePhoto(asset, "avatar");
  const formData = new FormData();
  await appendPhoto(formData, "photo", photo);
  return (
    await apiClient.post("/auth/update-customer-photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
}

export async function logout() {
  await apiClient.post("/auth/logout");
}
