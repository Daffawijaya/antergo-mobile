import { Tabs } from "expo-router";
import { GlobalCartFab } from "@/components/global-cart-fab";
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
  "ride/create",
  "ride/[id]",
  "food/index",
  "food/cart",
  "food/checkout",
  "food/merchant/[id]",
  "food/order/[id]",
  "chat/[id]",
];
export default function TabsLayout() {
  const { colors } = useAppTheme();
  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#767676",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 76,
          paddingTop: 5,
          paddingBottom: 16,
          borderTopWidth: 0,
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          fontFamily: "Outfit_600SemiBold",
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <TiHomeIcon size={24} color={String(color)} />
            ) : (
              <TiHomeOutlineIcon size={24} color={String(color)} />
            ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Activities",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <TbClipboardTextFilledIcon size={22} color={String(color)} />
            ) : (
              <TbClipboardTextIcon size={22} color={String(color)} />
            ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <BsChatTextFillIcon size={22} color={String(color)} />
            ) : (
              <BsChatTextIcon size={22} color={String(color)} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <FaUserIcon size={21} color={String(color)} />
            ) : (
              <FaRegUserIcon size={21} color={String(color)} />
            ),
        }}
      />
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null, tabBarStyle: { display: "none" } }} />
      ))}
    </Tabs>
      <GlobalCartFab />
    </>
  );
}
