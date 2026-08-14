import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'antergo_auth_token';
let cachedToken: string | null | undefined;
let unauthorizedHandler: (() => void | Promise<void>) | undefined;

function getWebStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

async function readToken() {
  if (Platform.OS === 'web') return getWebStorage()?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function writeToken(token: string) {
  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function deleteToken() {
  if (Platform.OS === 'web') {
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

export function setUnauthorizedHandler(handler: () => void | Promise<void>) {
  unauthorizedHandler = handler;
}

export async function handleUnauthorized() {
  await clearToken();
  await unauthorizedHandler?.();
}
