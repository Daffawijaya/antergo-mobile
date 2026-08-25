import { Tabs } from "expo-router";
import { AnimatedTabButton } from "@/components/animated-tab-button";
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
import { DriverLocationTracker } from "@/components/driver-location-tracker";
import { Colors } from "@/constants/colors";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";
const hidden = ["ride/[id]", "food/[id]", "send/[id]", "chat/[id]", "vehicles", "documents", "documents/[type]"];
export default function DriverLayout() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  return (
    <>
      <DriverLocationTracker />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarHideOnKeyboard: true,
          tabBarButton: (props) => <AnimatedTabButton {...props} />,
          tabBarStyle: {
            height: 76,
            paddingTop: 5,
            paddingBottom: 20,
            borderTopWidth: 0,
            backgroundColor: colors.surface,
            // Setara shadow-lg nativewind, dibalik ke atas, opacity 50%.
            boxShadow:
              "0 -10px 15px -3px rgba(0,0,0,0.05), 0 -4px 6px -4px rgba(0,0,0,0.05)",
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
          title: t("nav.home"),
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <TiHomeIcon size={23} color={String(color)} />
            ) : (
              <TiHomeOutlineIcon size={23} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
          title: t("nav.orders"),
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <TbClipboardTextFilledIcon size={23} color={String(color)} />
            ) : (
              <TbClipboardTextIcon size={23} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat/index"
          options={{
          title: t("nav.messages"),
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <BsChatTextFillIcon size={23} color={String(color)} />
            ) : (
              <BsChatTextIcon size={23} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
          title: t("nav.profile"),
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <FaUserIcon size={23} color={String(color)} />
            ) : (
              <FaRegUserIcon size={23} color={String(color)} />
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
