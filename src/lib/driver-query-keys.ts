export const driverKeys = {
  all: ['driver'] as const,
  profile: ['driver', 'profile'] as const,
  available: ['driver', 'rides', 'available'] as const,
  active: ['driver', 'rides', 'active'] as const,
  history: (page: number) => ['driver', 'rides', 'history', page] as const,
  detail: (id: number) => ['driver', 'rides', 'detail', id] as const,
};
