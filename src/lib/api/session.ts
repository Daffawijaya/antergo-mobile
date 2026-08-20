import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AppRole } from "@/types/api";

const TOKEN_KEY = "antergo_auth_token";
const ACTIVE_ROLE_KEY = "antergo_active_role";
const LAST_ACTIVE_KEY = "antergo_last_active";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
let cachedToken: string | null | undefined;

function getWebStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

async function readToken() {
  if (Platform.OS === "web") return getWebStorage()?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function writeToken(token: string) {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function deleteToken() {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredToken() {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await readToken();
  return cachedToken;
}

export async function saveToken(token: string) {
  cachedToken = token;
  await writeToken(token);
}

export async function clearToken() {
  cachedToken = null;
  await deleteToken();
}

export async function getStoredActiveRole(): Promise<AppRole | null> {
  if (Platform.OS === "web")
    return getWebStorage()?.getItem(ACTIVE_ROLE_KEY) as AppRole | null;
  return SecureStore.getItemAsync(ACTIVE_ROLE_KEY) as Promise<AppRole | null>;
}

export async function saveActiveRole(role: AppRole) {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(ACTIVE_ROLE_KEY, role);
    return;
  }
  await SecureStore.setItemAsync(ACTIVE_ROLE_KEY, role);
}

export async function clearActiveRole() {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(ACTIVE_ROLE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ACTIVE_ROLE_KEY);
}

/* ── last-active tracking ─────────────────────────────── */

async function readLastActive(): Promise<number | null> {
  const raw =
    Platform.OS === "web"
      ? getWebStorage()?.getItem(LAST_ACTIVE_KEY)
      : await SecureStore.getItemAsync(LAST_ACTIVE_KEY);
  return raw ? Number(raw) : null;
}

async function writeLastActive(ts: number) {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(LAST_ACTIVE_KEY, String(ts));
    return;
  }
  await SecureStore.setItemAsync(LAST_ACTIVE_KEY, String(ts));
}

export async function touchLastActive() {
  await writeLastActive(Date.now());
}

/** Returns true if session should be expired (>30 days inactive). */
export async function isSessionExpired(): Promise<boolean> {
  const last = await readLastActive();
  if (!last) return false; // first time → not expired
  return Date.now() - last > SESSION_TTL_MS;
}

export async function clearLastActive() {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(LAST_ACTIVE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(LAST_ACTIVE_KEY);
}
