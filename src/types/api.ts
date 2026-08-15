export type UserRole = "customer" | "driver" | "merchant" | "admin";
export type AppRole = Exclude<UserRole, "admin">;

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
  type: "motorcycle" | "car";
  brand: string;
  model: string;
  plate_number: string;
  color: string;
  image_uploaded: boolean;
};
export type DriverDocumentStatus = { type: "ktp" | "sim_a" | "sim_c"; uploaded: boolean };

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
  active_vehicle_id?: number | null;
  vehicle: Vehicle | null;
  vehicles?: Vehicle[];
  documents?: DriverDocumentStatus[];
  document_profile_complete?: boolean;
  location?: DriverLocation | null;
};

export type Product = {
  id: number;
  merchant_id: number;
  product_type: "food" | "goods";
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

export type OrderType = "ride" | "send" | "food";
export type ServiceVariant = "bike" | "car" | "delivery" | "food" | "shopping";
export type VehicleType = "motorcycle" | "car";
export type MerchantCategory = { id: number; name: string; slug: string };
export type OrderStatus =
  | "pending"
  | "searching_driver"
  | "driver_assigned"
  | "driver_arrived"
  | "merchant_confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "in_progress"
  | "delivering"
  | "completed"
  | "cancelled";

export type DriverRideStatusUpdate =
  "driver_arrived" | "in_progress" | "completed";
export type DriverFoodStatusUpdate = "picked_up" | "delivering" | "completed";
export type DriverSendStatusUpdate =
  "driver_arrived" | "picked_up" | "delivering" | "completed";

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

export type Payment = {
  id: number;
  order_id: number;
  method: "cash";
  status: "pending" | "paid" | "failed" | "refunded";
  amount: string;
  transaction_id: string | null;
  paid_at: string | null;
};
export type RatingTarget = "driver" | "merchant";
export type Rating = {
  id: number;
  order_id: number;
  user_id: number;
  driver_id: number | null;
  merchant_id: number | null;
  rating: number;
  comment: string | null;
  created_at: string;
};
export type SendDetails = {
  item_name: string | null;
  item_description: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
};

export type Order = {
  id: number;
  order_number: string;
  user_id: number;
  driver_id: number | null;
  merchant_id: number | null;
  vehicle_id?: number | null;
  vehicle_snapshot?: Pick<Vehicle, "id" | "type" | "brand" | "model" | "plate_number" | "color"> | null;
  type: OrderType;
  service_variant?: ServiceVariant | null;
  vehicle_type?: VehicleType | null;
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
  payment?: Payment | null;
  rating?: Rating | null;
  send_details?: SendDetails | null;
};

export type CreateSendInput = {
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  item_name: string;
  item_description?: string | null;
  recipient_name: string;
  recipient_phone: string;
  notes?: string | null;
  payment_method: "cash";
  vehicle_type: VehicleType;
};
export type CreateSendResponse = {
  message: string;
  order: Order;
  fare: {
    base_fare: number;
    price_per_km: number;
    distance_km: number;
    total: number;
  };
};
export type CreateRideInput = {
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  notes?: string | null;
  service_type?: "bike" | "car";
};

export type CreateRideResponse = {
  message: string;
  order: Order;
  fare: {
    base_fare: number;
    price_per_km: number;
    distance_km: number;
    total: number;
  };
};
export type OrderDetailResponse = { order: Order };
export type CancelRideResponse = { message: string; order: Order };

export type CreateFoodOrderInput = {
  merchant_id: number;
  items: { product_id: number; quantity: number }[];
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  payment_method: "cash";
  notes?: string | null;
  service_type?: "food" | "shopping";
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

export type PushRoute =
  | "customer_ride_detail"
  | "customer_food_detail"
  | "customer_send_detail"
  | "driver_ride_detail"
  | "driver_food_detail"
  | "driver_send_detail"
  | "customer_chat"
  | "driver_chat"
  | "merchant_food_detail";

export type PushNotificationData = {
  type: string;
  order_id: number;
  order_type: OrderType;
  route: PushRoute;
};

export type NotificationHistory = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: PushNotificationData;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};
export type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type ChatMessage = {
  id: number;
  order_id: number;
  sender_id: number;
  body: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender: Pick<User, "id" | "name" | "avatar">;
};
export type ChatConversation = Order & {
  unread_count: number;
  chat_messages: ChatMessage[];
};
