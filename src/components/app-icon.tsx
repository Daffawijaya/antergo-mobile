import type { ComponentProps } from "react";
import {
  ArrowUpDown,
  Bell,
  Bike,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleX,
  ClipboardList,
  Clock,
  History,
  House,
  Inbox,
  LocateFixed,
  LogOut,
  Map,
  MapPin,
  MessageSquareText,
  MessagesSquare,
  Moon,
  Navigation,
  Package,
  Phone,
  Search,
  Send,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Sun,
  TriangleAlert,
  User,
  Utensils,
  Camera,
} from "lucide-react-native";
import { IoMdCameraIcon } from "./brand-icons";

const icons = {
  home: House,
  orders: ClipboardList,
  clipboard: ClipboardList,
  inbox: MessagesSquare,
  chat: MessageSquareText,
  profile: User,
  search: Search,
  back: ChevronLeft,
  forward: ChevronRight,
  down: ChevronDown,
  close: CircleX,
  clock: Clock,
  pin: MapPin,
  locate: LocateFixed,
  map: Map,
  navigation: Navigation,
  send: Send,
  alert: TriangleAlert,
  empty: Inbox,
  phone: Phone,
  bell: Bell,
  settings: Settings,
  logout: LogOut,
  sun: Sun,
  moon: Moon,
  cart: ShoppingCart,
  store: Store,
  bike: Bike,
  car: Car,
  package: Package,
  utensils: Utensils,
  bag: ShoppingBag,
  swap: ArrowUpDown,
  history: History,
  check: Check,
  camera: Camera,
  camera_md: IoMdCameraIcon,
} as const;

export type AppIconName = keyof typeof icons;

export function AppIcon({
  name,
  size = 24,
  color = "#111827",
  strokeWidth = 2,
  filled = false,
  style,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
  style?: ComponentProps<typeof House>["style"];
}) {
  const Icon = icons[name];
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      fill={filled ? color : "none"}
      style={style}
    />
  );
}
