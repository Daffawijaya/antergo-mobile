import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/colors";
const hidden = [
  "payments",
  "search",
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
          backgroundColor: "#FFFFFF",
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
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={{
                ios: focused ? "house.fill" : "house",
                android: "home",
                web: "home",
              }}
              size={25}
              tintColor={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Activities",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={{
                ios: focused ? "list.clipboard.fill" : "list.clipboard",
                android: "assignment",
                web: "assignment",
              }}
              size={25}
              tintColor={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={{
                ios: focused ? "bubble.left.fill" : "bubble.left",
                android: focused ? "chat_bubble" : "chat_bubble_outline",
                web: focused ? "chat_bubble" : "chat_bubble_outline",
              }}
              size={25}
              tintColor={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={{
                ios: focused ? "person.crop.circle.fill" : "person.crop.circle",
                android: focused ? "account_circle" : "person_outline",
                web: focused ? "account_circle" : "person_outline",
              }}
              size={26}
              tintColor={String(color)}
            />
          ),
        }}
      />
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
