import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Merchant, Product } from '@/types/api';

export type CartItem = { product: Product; quantity: number };
type CartState = {
  merchant: Merchant | null;
  items: CartItem[];
  addItem: (merchant: Merchant, product: Product) => void;
  replaceCart: (merchant: Merchant, product: Product) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
};
export const useCartStore = create<CartState>()(persist((set) => ({
  merchant: null,
  items: [],
  addItem: (merchant, product) => set((state) => {
    const existing = state.items.find((item) => item.product.id === product.id);
    const items = existing
      ? state.items.map((item) => item.product.id === product.id ? { ...item, product, quantity: Math.min(product.stock, item.quantity + 1) } : item)
      : [...state.items, { product, quantity: 1 }];
    return { merchant, items };
  }),
  replaceCart: (merchant, product) => set({ merchant, items: [{ product, quantity: 1 }] }),
  setQuantity: (productId, quantity) => set((state) => {
    const items = quantity <= 0 ? state.items.filter((item) => item.product.id !== productId) : state.items.map((item) => item.product.id === productId ? { ...item, quantity: Math.min(item.product.stock, quantity) } : item);
    return { items, merchant: items.length ? state.merchant : null };
  }),
  clear: () => set({ merchant: null, items: [] }),
}), { name: 'antergo_food_cart', storage: createJSONStorage(() => AsyncStorage) }));
