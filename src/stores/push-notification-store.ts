import { create } from 'zustand';

export type PushStatus = 'idle' | 'requesting' | 'registered' | 'denied' | 'unavailable' | 'error';
type Store = {
  status: PushStatus;
  message: string | null;
  retry: (() => Promise<void>) | null;
  setPushState: (status: PushStatus, message?: string | null) => void;
  setRetry: (retry: (() => Promise<void>) | null) => void;
};
export const usePushNotificationStore = create<Store>((set) => ({
  status: 'idle',
  message: null,
  retry: null,
  setPushState: (status, message = null) => set({ status, message }),
  setRetry: (retry) => set({ retry }),
}));
