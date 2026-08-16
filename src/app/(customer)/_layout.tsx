import { Tabs } from "expo-router";
import {
  BsChatTextFillIcon,
  BsChatTextIcon,
  FaRegUserIcon,
  FaUserIcon,
  TbClipboardTextFilledIcon,
  TbClipboardTextIcon,
  TiHomeIcon,
  TiHomeOutlineIcon,
} from "@/components/brand-icons";
import { Colors } from "@/constants/colors";
import { useAppTheme } from "@/stores/theme-store";
const hidden = [
  "payments",
  "account-detail",
  "search",
  "driver-register",
  "merchant-register",
  "location-search",
  "location-picker",
  "ride/create",
  "ride/[id]",
  "food/index",
  "food/cart",
  "food/checkout",
  "food/merchant/[id]",
  "food/order/[id]",
  "send/create",
  "send/[id]",
  "chat/[id]",
];
export default function CustomerLayout() {
  const { colors } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#767676",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 64,
          paddingTop: 5,
          paddingBottom: 4,
          borderTopWidth: 0,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          fontFamily: "Outfit_600SemiBold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <TiHomeIcon size={25} color={String(color)} />
            ) : (
              <TiHomeOutlineIcon size={25} color={String(color)} />
            ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Activities",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <TbClipboardTextFilledIcon size={25} color={String(color)} />
            ) : (
              <TbClipboardTextIcon size={25} color={String(color)} />
            ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <BsChatTextFillIcon size={25} color={String(color)} />
            ) : (
              <BsChatTextIcon size={25} color={String(color)} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <FaUserIcon size={26} color={String(color)} />
            ) : (
              <FaRegUserIcon size={26} color={String(color)} />
            ),
        }}
      />
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
