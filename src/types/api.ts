export type UserRole = 'customer' | 'driver' | 'merchant' | 'admin';

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = { message: string; user: User; token: string };
export type MeResponse = { user: User };

export type Vehicle = {
  id: number;
  type: string;
  brand: string;
  model: string;
  plate_number: string;
  color: string;
};

export type Driver = {
  id: number;
  status: string;
  is_online: boolean;
  rating: string;
  total_completed_orders: number;
  user: User;
  vehicle: Vehicle | null;
};

export type Product = {
  id: number;
  merchant_id: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  image: string | null;
  is_available: boolean;
};

export type Merchant = {
  id: number;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  logo: string | null;
  is_open: boolean;
  is_active: boolean;
  products: Product[];
  category?: { id: number; name: string } | null;
};

export type Order = {
  id: number;
  order_number: string;
  type: 'ride' | 'food';
  status: string;
  pickup_address: string | null;
  destination_address: string | null;
  total_price: string;
  created_at: string;
};

export type LaravelPaginator<T> = {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
};

export type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};
