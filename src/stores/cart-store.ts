import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Merchant, Product } from "@/types/api";

export type CartItem = { product: Product; quantity: number };

export type PaymentMethod = "cash" | "midtrans";

type MerchantCart = {
  merchant: Merchant;
  items: CartItem[];
};

type CartState = {
  /** Per-merchant carts keyed by merchant ID */
  carts: Record<number, MerchantCart>;
  /** Selected payment method, shared across the cart flow */
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  /** Add item to a specific merchant's cart */
  addItem: (merchant: Merchant, product: Product) => void;
  /** Replace entire cart for a merchant (used when switching product type) */
  replaceCart: (merchant: Merchant, product: Product) => void;
  /** Set quantity for a product in a specific merchant's cart */
  setQuantity: (merchantId: number, productId: number, quantity: number) => void;
  /** Clear a specific merchant's cart */
  clearMerchant: (merchantId: number) => void;
  /** Clear all carts */
  clearAll: () => void;
  /** Get cart for a specific merchant */
  getCart: (merchantId: number) => MerchantCart | undefined;
  /** Get total items across all carts */
  totalItems: () => number;
  /** Get total price for a specific merchant's cart */
  totalPrice: (merchantId: number) => number;
  /** Get total items for a specific merchant's cart */
  totalMerchantItems: (merchantId: number) => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      carts: {},
      paymentMethod: "cash",
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

      addItem: (merchant, product) =>
        set((state) => {
          const existing = state.carts[merchant.id];
          if (existing) {
            // Same merchant — add to existing cart
            const items = existing.items;
            const existingItem = items.find(
              (item) => item.product.id === product.id,
            );
            const newItems = existingItem
              ? items.map((item) =>
                  item.product.id === product.id
                    ? {
                        ...item,
                        product,
                        quantity: Math.min(
                          product.stock,
                          item.quantity + 1,
                        ),
                      }
                    : item,
                )
              : [...items, { product, quantity: 1 }];
            return {
              carts: {
                ...state.carts,
                [merchant.id]: { merchant, items: newItems },
              },
            };
          }
          // New merchant cart
          return {
            carts: {
              ...state.carts,
              [merchant.id]: {
                merchant,
                items: [{ product, quantity: 1 }],
              },
            },
          };
        }),

      replaceCart: (merchant, product) =>
        set((state) => ({
          carts: {
            ...state.carts,
            [merchant.id]: {
              merchant,
              items: [{ product, quantity: 1 }],
            },
          },
        })),

      setQuantity: (merchantId, productId, quantity) =>
        set((state) => {
          const cart = state.carts[merchantId];
          if (!cart) return state;

          const newItems =
            quantity <= 0
              ? cart.items.filter((item) => item.product.id !== productId)
              : cart.items.map((item) =>
                  item.product.id === productId
                    ? {
                        ...item,
                        quantity: Math.min(item.product.stock, quantity),
                      }
                    : item,
                );

          const newCarts = { ...state.carts };
          if (newItems.length === 0) {
            delete newCarts[merchantId];
          } else {
            newCarts[merchantId] = { ...cart, items: newItems };
          }
          return { carts: newCarts };
        }),

      clearMerchant: (merchantId) =>
        set((state) => {
          const newCarts = { ...state.carts };
          delete newCarts[merchantId];
          return { carts: newCarts };
        }),

      clearAll: () => set({ carts: {} }),

      getCart: (merchantId) => get().carts[merchantId],

      totalItems: () =>
        Object.values(get().carts).reduce(
          (sum, cart) =>
            sum + cart.items.reduce((s, item) => s + item.quantity, 0),
          0,
        ),

      totalPrice: (merchantId) => {
        const cart = get().carts[merchantId];
        if (!cart) return 0;
        return cart.items.reduce(
          (sum, item) => sum + Number(item.product.price) * item.quantity,
          0,
        );
      },

      totalMerchantItems: (merchantId) => {
        const cart = get().carts[merchantId];
        if (!cart) return 0;
        return cart.items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "antergo_food_cart",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
