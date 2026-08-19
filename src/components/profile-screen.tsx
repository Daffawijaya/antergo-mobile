import { AppIcon } from "@/components/app-icon";
import { FaWhatsappIcon, HiUserCircleIcon } from "@/components/brand-icons";
import { Colors } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { getDriverApplication } from "@/lib/api/resources";
import { roleAvatar } from "@/lib/user-avatar";
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
import { useCallback, useState } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Notice } from "./ui";

const ROLE_LABELS: Record<AppRole, string> = {
  customer: "Pelanggan",
  driver: "Driver",
  merchant: "Merchant",
};

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  customer: "Pesan makanan",
  driver: "Terima pesanan",
  merchant: "Kelola toko",
};

const roleImage = (role: AppRole) => {
  if (role === "customer") return require("@/assets/icon/customer.png");
  if (role === "driver") return require("@/assets/icon/driver.png");
  return require("@/assets/icon/merchant.png");
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
  
  // Fetch driver profile to get photo_url_full
  const { data: driverProfile } = useQuery({
    queryKey: ["driver-profile"],
    queryFn: () => getDriverApplication(), // Reusing this or similar endpoint to get driver details
    enabled: activeRole === "driver",
  });

  const avatar = activeRole === "driver" ? driverProfile?.photo_url_full : roleAvatar(user, activeRole);

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
        <View className="bg-surface-muted px-4 pt-4">
          <Pressable
            onPress={() => router.push("/(customer)/(tabs)/account-detail")}
            className="-mb-12 rounded-2xl bg-surface p-4 active:opacity-90"
            style={{
              shadowColor: "#111827",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.07,
              shadowRadius: 14,
              elevation: 6,
            }}
          >
            <View className="flex-row items-center gap-3">
              {avatar ? (
                <View className="h-16 w-16 overflow-hidden rounded-full">
                  <Image
                    source={{ uri: avatar }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <HiUserCircleIcon size={64} color={colors.muted} />
              )}
              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="font-bold text-xl text-foreground"
                >
                  {user?.name ?? "Pengguna AnterGo"}
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3.5"
              contentContainerClassName="flex-row items-center gap-2"
            >
              <View className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                <FaWhatsappIcon size={14} color="#25D366" />
                <Text className="font-semibold text-sm text-muted">
                  {user?.phone || "Nomor telepon belum tersedia"}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                <Image
                  source={require("@/assets/icon/gmail.webp")}
                  style={{ height: 16, width: 14 }}
                  resizeMode="contain"
                />
                <Text className="font-medium text-sm text-muted">
                  {user?.email ?? "-"}
                </Text>
              </View>
            </ScrollView>
          </Pressable>
        </View>
        <View className="h-16" />

        {ownedRoles.length > 1 ? (
          <View className="px-4 pb-4 pt-0">
            <View className="flex-row gap-2">
              {ownedRoles.map((role) => {
                const selected = role === activeRole;
                return (
                  <Pressable
                    key={role}
                    onPress={() => void setActiveRole(role)}
                    className={`flex-1 rounded-[18px] border p-4 active:opacity-80 ${selected ? "border-[#FFB900]" : "border-border bg-surface"}`}
                    style={
                      selected
                        ? { backgroundColor: mode === "dark" ? "#2B2410" : "#FFF9E6" }
                        : null
                    }
                  >
                    <View className="items-start gap-3">
                      <Image
                        source={roleImage(role)}
                        style={{ width: 32, height: 32 }}
                        resizeMode="contain"
                      />
                      <View>
                        <Text
                          className={`font-semibold text-sm ${selected ? (mode === "dark" ? "text-white" : "text-black") : "text-foreground"}`}
                        >
                          {ROLE_LABELS[role]}
                        </Text>
                        <Text className="text-[11px] text-muted">
                          {ROLE_DESCRIPTIONS[role]}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View className="px-4 pb-4">
          <View className="flex-row rounded-full bg-surface-muted p-1">
            {(["light", "dark"] as ThemeMode[]).map((item) => {
              const selected = mode === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => void setThemeMode(item)}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-full py-2.5 transition-colors ${
                    selected ? "bg-surface elevation-sm" : ""
                  }`}
                >
                  <AppIcon
                    name={item === "light" ? "sun" : "moon"}
                    size={16}
                    color={selected ? colors.text : colors.muted}
                  />
                  <Text
                    className={`font-semibold text-sm ${
                      selected ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {item === "light" ? "Terang" : "Gelap"}
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
                        pathname: "/(customer)/(tabs)/driver-register",
                        params: { returnTo: "/(customer)/(tabs)/profile" },
                      })
              }
            />
          ) : null}
          {activeRole === "driver" ? (
            <>
              <SettingsRow
                icon="directions_car"
                title="Kendaraan Saya"
                onPress={() => router.push("/(driver)/vehicles")}
              />
              <SettingsRow
                icon="documents"
                title="Dokumen & SIM"
                onPress={() => router.push("/(driver)/documents")}
              />
            </>
          ) : null}
          {!user?.roles.includes("merchant") ? (
            <SettingsRow
              icon="storefront"
              title="Daftar sebagai merchant"
              onPress={() =>
                router.push({
                  pathname: "/(customer)/(tabs)/merchant-register",
                  params: { returnTo: "/(customer)/(tabs)/profile" },
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
  icon:
    | "badge"
    | "settings"
    | "logout"
    | "two_wheeler"
    | "storefront"
    | "directions_car"
    | "documents";
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { colors } = useAppTheme();
  const content = (
    <>
      <View className="w-8 items-center">
        <AppIcon
          name={
            icon === "badge"
              ? "bell"
              : icon === "settings"
                ? "settings"
                : icon === "logout"
                  ? "logout"
                  : icon === "two_wheeler"
                    ? "bike"
                    : icon === "directions_car"
                      ? "car"
                      : icon === "documents"
                        ? "clipboard"
                        : "store"
          }
          size={21}
          color={danger ? Colors.danger : colors.text}
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
        <AppIcon name="forward" size={20} color={colors.muted} />
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
