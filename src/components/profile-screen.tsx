import { Colors } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { getDriverApplication } from "@/lib/api/resources";
import { useAuthStore } from "@/stores/auth-store";
import { usePushNotificationStore } from "@/stores/push-notification-store";
import {
  useAppTheme,
  useThemeStore,
  type ThemeMode,
} from "@/stores/theme-store";
import type { AppRole } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Notice } from "./ui";

const ROLE_LABELS: Record<AppRole, string> = {
  customer: "Customer",
  driver: "Driver",
  merchant: "Merchant",
};
const roleSymbol = (role: AppRole) =>
  role === "customer"
    ? {
        ios: "person.fill" as const,
        android: "person" as const,
        web: "person" as const,
      }
    : role === "driver"
      ? {
          ios: "motorcycle.fill" as const,
          android: "two_wheeler" as const,
          web: "two_wheeler" as const,
        }
      : {
          ios: "storefront.fill" as const,
          android: "storefront" as const,
          web: "storefront" as const,
        };

export function ProfileScreen() {
  const router = useRouter();
  const { mode, colors } = useAppTheme();
  const setThemeMode = useThemeStore((state) => state.setMode);
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const logout = useAuthStore((state) => state.logout);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const pushStatus = usePushNotificationStore((state) => state.status);
  const pushMessage = usePushNotificationStore((state) => state.message);
  const retryPush = usePushNotificationStore((state) => state.retry);
  const { data: driverApplication, refetch } = useQuery({
    queryKey: ["driver-application"],
    queryFn: getDriverApplication,
  });
  useFocusEffect(
    useCallback(() => {
      void refreshUser().catch(() => undefined);
      void refetch();
    }, [refreshUser, refetch]),
  );
  const ownedRoles = (["customer", "driver", "merchant"] as AppRole[]).filter(
    (role) => user?.roles.includes(role),
  );
  const pushLabel =
    pushStatus === "registered"
      ? "Aktif"
      : pushStatus === "denied"
        ? "Izin diperlukan"
        : pushStatus === "unavailable"
          ? "Tidak tersedia"
          : pushStatus === "error"
            ? "Gagal"
            : "Memeriksa…";
  const handleLogout = async () => {
    setLoading(true);
    setError(undefined);
    try {
      await logout();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-6"
      >
        <View className="bg-surface-muted px-4 pb-7 pt-3">
          <Pressable
            onPress={() => router.push("/(customer)/account-detail" as never)}
            className="rounded-3xl bg-surface p-4 elevation-md active:opacity-90"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-brand">
                <SymbolView
                  name={{
                    ios: "person.fill",
                    android: "person",
                    web: "person",
                  }}
                  size={40}
                  tintColor="#FFFFFF"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="font-bold text-xl text-foreground"
                >
                  {user?.name ?? "Pengguna AnterGo"}
                </Text>
                <Text
                  numberOfLines={1}
                  className="font-sans text-sm text-muted"
                >
                  {user?.email ?? "-"}
                </Text>
              </View>
              <View className="rounded-full bg-surface-muted px-4 py-2">
                <Text className="font-bold text-brand">Profil</Text>
              </View>
            </View>
            <View className="mt-4 flex-row items-center gap-2 rounded-full border border-border px-3 py-2.5">
              <SymbolView
                name={{ ios: "phone.fill", android: "phone", web: "phone" }}
                size={17}
                tintColor={Colors.primary}
              />
              <Text
                numberOfLines={1}
                className="flex-1 font-semibold text-sm text-foreground"
              >
                {user?.phone || "Nomor telepon belum tersedia"}
              </Text>
              <SymbolView
                name={{
                  ios: "chevron.right",
                  android: "chevron_right",
                  web: "chevron_right",
                }}
                size={18}
                tintColor={colors.muted}
              />
            </View>
          </Pressable>
        </View>

        {ownedRoles.length > 1 ? (
          <View className="border-b-[10px] border-surface-muted bg-background px-4 py-5">
            <Text className="mb-3 font-bold text-lg text-foreground">
              Akun AnterGo
            </Text>
            <View className="flex-row gap-2">
              {ownedRoles.map((role) => {
                const selected = role === activeRole;
                return (
                  <Pressable
                    key={role}
                    onPress={() => void setActiveRole(role)}
                    className={`flex-1 items-center rounded-2xl border px-2 py-3 ${selected ? "border-brand bg-brand" : "border-border bg-surface"}`}
                  >
                    <SymbolView
                      name={roleSymbol(role)}
                      size={24}
                      tintColor={selected ? "#FFFFFF" : colors.text}
                    />
                    <Text
                      className={`mt-1 font-semibold text-sm ${selected ? "text-white" : "text-foreground"}`}
                    >
                      {ROLE_LABELS[role]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View className="border-b-[10px] border-surface-muted px-4 py-5">
          <View className="flex-row gap-3">
            {(["light", "dark"] as ThemeMode[]).map((item) => {
              const selected = mode === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => void setThemeMode(item)}
                  className={`flex-1 flex-row items-center gap-3 rounded-2xl border p-4 ${selected ? "border-brand bg-brand" : "border-border bg-surface"}`}
                >
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-full ${selected ? "bg-white/20" : "bg-surface-muted"}`}
                  >
                    <SymbolView
                      name={{
                        ios: item === "light" ? "sun.max.fill" : "moon.fill",
                        android: item === "light" ? "light_mode" : "dark_mode",
                        web: item === "light" ? "light_mode" : "dark_mode",
                      }}
                      size={22}
                      tintColor={selected ? "#FFFFFF" : colors.text}
                    />
                  </View>
                  <Text
                    className={`font-bold ${selected ? "text-white" : "text-foreground"}`}
                  >
                    {item === "light" ? "Light" : "Dark"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="px-4 py-5">
          <Text className="mb-2 font-bold text-xl text-foreground">Umum</Text>
          <SettingsRow
            icon="badge"
            title="Notifikasi"
            value={pushLabel}
            onPress={
              (pushStatus === "denied" || pushStatus === "error") && retryPush
                ? () => void retryPush()
                : undefined
            }
          />
          {pushStatus === "denied" ? (
            <SettingsRow
              icon="settings"
              title="Buka pengaturan aplikasi"
              onPress={() => void Linking.openSettings()}
            />
          ) : null}
          {!user?.roles.includes("driver") ? (
            <SettingsRow
              icon="two_wheeler"
              title={
                driverApplication?.status === "pending"
                  ? "Pendaftaran driver diproses"
                  : "Daftar sebagai driver"
              }
              onPress={
                driverApplication?.status === "pending"
                  ? undefined
                  : () =>
                      router.push({
                        pathname: "/(customer)/driver-register",
                        params: { returnTo: "/(customer)/profile" },
                      })
              }
            />
          ) : null}
          {activeRole === "driver" ? (
            <SettingsRow
              icon="directions_car"
              title="Kendaraan Saya"
              onPress={() => router.push("/(driver)/vehicles" as never)}
            />
          ) : null}
          {!user?.roles.includes("merchant") ? (
            <SettingsRow
              icon="storefront"
              title="Daftar sebagai merchant"
              onPress={() =>
                router.push({
                  pathname: "/(customer)/merchant-register",
                  params: { returnTo: "/(customer)/profile" },
                })
              }
            />
          ) : null}
          <SettingsRow
            icon="logout"
            title={loading ? "Sedang keluar…" : "Keluar dari akun"}
            danger
            onPress={() => void handleLogout()}
          />
          {pushMessage ? (
            <Text className="mt-2 text-sm text-muted">{pushMessage}</Text>
          ) : null}
          {error ? (
            <View className="mt-3">
              <Notice tone="danger">{error}</Notice>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  title,
  value,
  onPress,
  danger = false,
}: {
  icon: "badge" | "settings" | "logout" | "two_wheeler" | "storefront" | "directions_car";
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { colors } = useAppTheme();
  const content = (
    <>
      <View className="w-8 items-center">
        <SymbolView
          name={{
            ios:
              icon === "badge"
                ? "bell.fill"
                : icon === "settings"
                  ? "gearshape.fill"
                  : icon === "logout"
                    ? "rectangle.portrait.and.arrow.right"
                    : icon === "two_wheeler"
                      ? "motorcycle.fill"
                      : icon === "directions_car"
                        ? "car.fill"
                        : "storefront.fill",
            android: icon === "badge" ? "notifications" : icon,
            web: icon,
          }}
          size={21}
          tintColor={danger ? Colors.danger : colors.text}
        />
      </View>
      <Text
        className={`flex-1 font-medium text-base ${danger ? "text-danger" : "text-foreground"}`}
      >
        {title}
      </Text>
      {value ? (
        <Text
          numberOfLines={1}
          className="max-w-32 text-right text-sm text-muted"
        >
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          size={20}
          tintColor={colors.muted}
        />
      ) : null}
    </>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      className={`min-h-14 flex-row items-center gap-2 border-b border-border ${danger ? "mt-2 rounded-2xl border-b-0" : ""}`}
    >
      {content}
    </Pressable>
  ) : (
    <View className="min-h-14 flex-row items-center gap-2 border-b border-border">
      {content}
    </View>
  );
}
