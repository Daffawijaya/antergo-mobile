import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { DriverLocationTracker } from "@/components/driver-location-tracker";
import { Colors } from "@/constants/colors";
import { useAppTheme } from "@/stores/theme-store";
const hidden = ["ride/[id]", "food/[id]", "send/[id]", "chat/[id]"];
export default function DriverLayout() {
  const { colors } = useAppTheme();
  return (
    <>
      <DriverLocationTracker />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: 72,
            paddingTop: 8,
            paddingBottom: 9,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: "house.fill", android: "home", web: "home" }}
                size={23}
                tintColor={String(color)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{
                  ios: "doc.text.fill",
                  android: "receipt_long",
                  web: "receipt_long",
                }}
                size={23}
                tintColor={String(color)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat/index"
          options={{
            title: "Chat",
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{
                  ios: "bubble.left.and.bubble.right.fill",
                  android: "chat_bubble",
                  web: "chat_bubble",
                }}
                size={23}
                tintColor={String(color)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: "person.fill", android: "person", web: "person" }}
                size={23}
                tintColor={String(color)}
              />
            ),
          }}
        />
        {hidden.map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>
    </>
  );
}
