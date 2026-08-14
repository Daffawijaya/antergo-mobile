import { create } from "zustand";

import * as authApi from "@/lib/api/auth";
import { queryClient } from "@/lib/query-client";
import { stopDriverLocationTracking } from "@/lib/driver-location-service";
import {
  clearStoredPushToken,
  unregisterStoredPushToken,
} from "@/lib/api/push-notifications";
import {
  clearActiveRole,
  clearToken,
  getStoredActiveRole,
  getStoredToken,
  saveActiveRole,
  saveToken,
  setUnauthorizedHandler,
} from "@/lib/api/session";
import type { LoginInput, RegisterInput } from "@/lib/api/auth";
import type { AppRole, User } from "@/types/api";

const APP_ROLES: AppRole[] = ["customer", "driver", "merchant"];

function validAppRoles(user: User) {
  return APP_ROLES.filter((role) => user.roles.includes(role));
}

async function resolveActiveRole(user: User, storedRole?: AppRole | null) {
  const roles = validAppRoles(user);
  const activeRole =
    storedRole && roles.includes(storedRole) ? storedRole : (roles[0] ?? null);
  if (activeRole) await saveActiveRole(activeRole);
  else await clearActiveRole();
  return activeRole;
}

type AuthState = {
  user: User | null;
  activeRole: AppRole | null;
  isHydrated: boolean;
  restoreSession: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  setActiveRole: (role: AppRole) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeRole: null,
  isHydrated: false,
  restoreSession: async () => {
    const token = await getStoredToken();
    if (!token) return set({ user: null, activeRole: null, isHydrated: true });
    try {
      const user = await authApi.getMe();
      const activeRole = await resolveActiveRole(
        user,
        await getStoredActiveRole(),
      );
      set({ user, activeRole, isHydrated: true });
    } catch {
      await stopDriverLocationTracking();
      await Promise.all([clearToken(), clearActiveRole()]);
      queryClient.clear();
      set({ user: null, activeRole: null, isHydrated: true });
    }
  },
  refreshUser: async () => {
    const user = await authApi.getMe();
    const activeRole = await resolveActiveRole(user, get().activeRole);
    set({ user, activeRole });
    return user;
  },
  login: async (input) => {
    const result = await authApi.login(input);
    await saveToken(result.token);
    const activeRole = await resolveActiveRole(
      result.user,
      await getStoredActiveRole(),
    );
    set({ user: result.user, activeRole });
  },
  register: async (input) => {
    const result = await authApi.register(input);
    await saveToken(result.token);
    const activeRole = await resolveActiveRole(result.user);
    set({ user: result.user, activeRole });
  },
  setActiveRole: async (role) => {
    const user = get().user;
    if (!user || !validAppRoles(user).includes(role)) return;
    if (get().activeRole === "driver" && role !== "driver")
      await stopDriverLocationTracking();
    await saveActiveRole(role);
    set({ activeRole: role });
  },
  logout: async () => {
    try {
      try {
        await unregisterStoredPushToken();
      } catch {
        await clearStoredPushToken();
      }
      await authApi.logout();
    } finally {
      await stopDriverLocationTracking();
      await Promise.all([clearToken(), clearActiveRole()]);
      queryClient.clear();
      set({ user: null, activeRole: null });
    }
  },
  clearSession: async () => {
    await stopDriverLocationTracking();
    await Promise.all([clearToken(), clearActiveRole()]);
    queryClient.clear();
    set({ user: null, activeRole: null, isHydrated: true });
  },
}));

setUnauthorizedHandler(() => useAuthStore.getState().clearSession());
