import { create } from 'zustand';

import * as authApi from '@/lib/api/auth';
import { queryClient } from '@/lib/query-client';
import { clearToken, getStoredToken, saveToken, setUnauthorizedHandler } from '@/lib/api/session';
import type { LoginInput, RegisterInput } from '@/lib/api/auth';
import type { User } from '@/types/api';

type AuthState = {
  user: User | null;
  isHydrated: boolean;
  restoreSession: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,
  restoreSession: async () => {
    const token = await getStoredToken();
    if (!token) return set({ user: null, isHydrated: true });
    try {
      set({ user: await authApi.getMe(), isHydrated: true });
    } catch {
      await clearToken();
      queryClient.clear();
      set({ user: null, isHydrated: true });
    }
  },
  login: async (input) => {
    const result = await authApi.login(input);
    await saveToken(result.token);
    set({ user: result.user });
  },
  register: async (input) => {
    const result = await authApi.register(input);
    await saveToken(result.token);
    set({ user: result.user });
  },
  logout: async () => {
    try { await authApi.logout(); } finally {
      await clearToken();
      queryClient.clear();
      set({ user: null });
    }
  },
  clearSession: async () => {
    await clearToken();
    queryClient.clear();
    set({ user: null, isHydrated: true });
  },
}));

setUnauthorizedHandler(() => useAuthStore.getState().clearSession());
