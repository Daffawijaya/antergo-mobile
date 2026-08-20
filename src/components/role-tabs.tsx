import { Tabs } from "expo-router";
import {
  FaRegUserIcon,
  FaUserIcon,
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
}: {
  middle: string;
  hidden?: string | string[];
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
        tabBarStyle: {
          height: 78,
          paddingTop: 8,
          paddingBottom: 15,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
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
