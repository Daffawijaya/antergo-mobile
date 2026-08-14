export const foodKeys = {
  merchants: ['food', 'merchants'] as const,
  merchant: (id: number) => ['food', 'merchant', id] as const,
  products: (merchantId: number, search = '') => ['food', 'products', merchantId, search] as const,
  order: (id: number) => ['food', 'order', id] as const,
  merchantOrders: ['merchant', 'food-orders'] as const,
};
