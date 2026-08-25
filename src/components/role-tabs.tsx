import { Tabs } from "expo-router";
import { AnimatedTabButton } from "@/components/animated-tab-button";
import {
  FaRegUserIcon,
  FaUserIcon,
  TbBuildingStoreIcon,
  TbClipboardTextFilledIcon,
  TbClipboardTextIcon,
  TiHomeIcon,
  TiHomeOutlineIcon,
} from "@/components/brand-icons";
import { Colors } from "@/constants/colors";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";
export function RoleTabs({
  middle,
  hidden,
  store,
}: {
  middle: string;
  hidden?: string | string[];
  /** Nama route tab "Toko" — hanya dirender kalau diisi. */
  store?: string;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  return (
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
        name={middle}
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
      {store ? (
        <Tabs.Screen
          name={store}
          options={{
            title: t("nav.store"),
            tabBarIcon: ({ color }) => (
              <TbBuildingStoreIcon size={23} color={String(color)} />
            ),
          }}
        />
      ) : null}
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
      {hidden
        ? (Array.isArray(hidden) ? hidden : [hidden]).map((name) => (
            <Tabs.Screen key={name} name={name} options={{ href: null }} />
          ))
        : null}
    </Tabs>
  );
}
