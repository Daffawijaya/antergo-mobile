import type { AuthResponse, MeResponse } from "@/types/api";
import { apiClient } from "./client";

export type LoginInput = { email: string; password: string };
export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
};

export async function login(input: LoginInput) {
  return (await apiClient.post<AuthResponse>("/auth/login", input)).data;
}

export async function register(input: RegisterInput) {
  return (await apiClient.post<AuthResponse>("/auth/register", input)).data;
}

export async function getMe() {
  return (await apiClient.get<MeResponse>("/auth/me")).data.user;
}

export async function logout() {
  await apiClient.post("/auth/logout");
}
