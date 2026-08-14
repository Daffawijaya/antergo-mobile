export type UserRole = 'customer' | 'driver' | 'merchant' | 'admin';
export type AppRole = Exclude<UserRole, 'admin'>;

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  roles: UserRole[];
  avatar: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = { message: string; user: User; token: string };
export type MeResponse = { user: User };

export type Vehicle = {
  id: number;
  driver_id: number;
  type: string;
  brand: string;
  model: string;
  plate_number: string;
  color: string;
};

export type DriverLocation = {
  id: number;
  driver_id: number;
  latitude: string;
  longitude: string;
  heading: string | null;
  speed: string | null;
  updated_at: string;
};

export type Driver = {
  id: number;
  user_id: number;
  status: string;
  is_online: boolean;
  rating: string;
  total_completed_orders: number;
  user: User;
  vehicle: Vehicle | null;
  location?: DriverLocation | null;
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
  merchant?: Merchant;
  created_at?: string;
  updated_at?: string;
};

export type Merchant = {
  id: number;
  user_id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  logo: string | null;
  is_open: boolean;
  is_active: boolean;
  products?: Product[];
  category?: { id: number; name: string; slug?: string } | null;
  created_at?: string;
  updated_at?: string;
};

export type OrderType = 'ride' | 'send' | 'food';
export type OrderStatus =
  | 'pending'
  | 'searching_driver'
  | 'driver_assigned'
  | 'driver_arrived'
  | 'merchant_confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'in_progress'
  | 'delivering'
  | 'completed'
  | 'cancelled';

export type DriverRideStatusUpdate = 'driver_arrived' | 'in_progress' | 'completed';
export type DriverFoodStatusUpdate = 'picked_up' | 'delivering' | 'completed';

export type OrderStatusHistory = {
  id: number;
  order_id: number;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  price: string;
  quantity: number;
  subtotal: string;
  product?: Product;
};

export type Order = {
  id: number;
  order_number: string;
  user_id: number;
  driver_id: number | null;
  merchant_id: number | null;
  type: OrderType;
  pickup_address: string | null;
  pickup_latitude: string | null;
  pickup_longitude: string | null;
  destination_address: string | null;
  destination_latitude: string | null;
  destination_longitude: string | null;
  distance: string | null;
  pickup_distance?: number;
  estimated_duration: number | null;
  subtotal: string;
  delivery_fee: string;
  service_fee: string;
  total_price: string;
  payment_method: string;
  payment_status: string;
  status: OrderStatus;
  notes: string | null;
  cancelled_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  driver?: Driver | null;
  merchant?: Merchant | null;
  items?: OrderItem[];
  status_histories?: OrderStatusHistory[];
};

export type CreateRideInput = {
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  notes?: string | null;
};

export type CreateRideResponse = {
  message: string;
  order: Order;
  fare: { base_fare: number; price_per_km: number; distance_km: number; total: number };
};
export type OrderDetailResponse = { order: Order };
export type CancelRideResponse = { message: string; order: Order };


export type CreateFoodOrderInput = {
  merchant_id: number;
  items: { product_id: number; quantity: number }[];
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  payment_method: 'cash';
  notes?: string | null;
};
export type FoodOrderResponse = { message: string; order: Order };
export type LaravelPaginator<T> = {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
};

export type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};
