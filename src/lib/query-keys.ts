export const orderKeys = {
  all: ['customer', 'orders'] as const,
  detail: (id: number) => ['customer', 'orders', id] as const,
};
