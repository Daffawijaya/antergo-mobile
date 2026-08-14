import { useFocusEffect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { getDriverApplication } from "@/lib/api/resources";
import { useAuthStore } from "@/stores/auth-store";
import { usePushNotificationStore } from "@/stores/push-notification-store";
import type { AppRole } from "@/types/api";
import { Notice } from "./ui";

const ROLE_LABELS: Record<AppRole, string> = {
  customer: "Customer",
  driver: "Driver",
  merchant: "Merchant",
};
const ROLES: AppRole[] = ["customer", "driver", "merchant"];
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
  const { data: driverApplication, refetch: refetchDriverApplication } =
    useQuery({
      queryKey: ["driver-application"],
      queryFn: getDriverApplication,
    });
  useFocusEffect(
    useCallback(() => {
      void refreshUser().catch(() => undefined);
      void refetchDriverApplication();
    }, [refreshUser, refetchDriverApplication]),
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

  const switchRole = async (role: AppRole) => {
    if (user?.roles.includes(role)) {
      await setActiveRole(role);
      return;
    }
    if (role === "driver" && !driverApplication)
      router.push("/(customer)/driver-register");
    if (role === "merchant") router.push("/(customer)/merchant-register");
  };
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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.hero}>
          <View style={styles.identityCard}>
            <View style={styles.identityRow}>
              <View style={styles.avatar}>
                <SymbolView
                  name={{
                    ios: "person.fill",
                    android: "person",
                    web: "person",
                  }}
                  size={42}
                  tintColor="#FFFFFF"
                />
              </View>
              <View style={styles.identityCopy}>
                <Text numberOfLines={1} style={styles.name}>
                  {user?.name ?? "Pengguna AnterGo"}
                </Text>
                <Text numberOfLines={1} style={styles.email}>
                  {user?.email ?? "-"}
                </Text>
              </View>
              <View style={styles.profilePill}>
                <Text style={styles.profilePillText}>Profil</Text>
              </View>
            </View>
            <View style={styles.accountLine}>
              <SymbolView
                name={{ ios: "phone.fill", android: "phone", web: "phone" }}
                size={18}
                tintColor={Colors.primary}
              />
              <Text style={styles.accountLineText}>
                {user?.phone ?? "Nomor telepon belum tersedia"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.roleSection}>
          <Text style={styles.sectionTitle}>Ganti mode</Text>
          <View style={styles.roleScroller}>
            {ROLES.map((role) => {
              const available = Boolean(user?.roles.includes(role));
              const selected = activeRole === role;
              const pending =
                role === "driver" && driverApplication?.status === "pending";
              return (
                <Pressable
                  key={role}
                  disabled={pending}
                  onPress={() => {
                    void switchRole(role);
                  }}
                  style={[
                    styles.roleCard,
                    selected && styles.roleCardSelected,
                    (!available || pending) && styles.roleCardDisabled,
                  ]}
                >
                  <View
                    style={[
                      styles.roleIcon,
                      selected && styles.roleIconSelected,
                    ]}
                  >
                    <SymbolView
                      name={roleSymbol(role)}
                      size={27}
                      tintColor={
                        selected
                          ? "#FFFFFF"
                          : available
                            ? Colors.primary
                            : "#A3A3A3"
                      }
                    />
                  </View>
                  <View style={styles.roleTextWrap}>
                    <Text
                      style={[
                        styles.roleName,
                        selected && styles.roleNameSelected,
                      ]}
                    >
                      {ROLE_LABELS[role]}
                    </Text>
                    <Text
                      style={[
                        styles.roleStatus,
                        selected && styles.roleStatusSelected,
                      ]}
                    >
                      {selected
                        ? "Mode aktif"
                        : available
                          ? "Ketuk untuk beralih"
                          : "Belum tersedia"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.heading}>Umum</Text>
          <MenuRow
            icon="badge"
            title="Akses tersedia"
            value={
              user?.roles
                .map((role) => (role === "admin" ? "Admin" : ROLE_LABELS[role]))
                .join(", ") ?? "-"
            }
          />
          <MenuRow
            icon="notifications"
            title="Notifikasi"
            value={pushLabel}
            onPress={
              (pushStatus === "denied" || pushStatus === "error") && retryPush
                ? () => {
                    void retryPush();
                  }
                : undefined
            }
          />
          {pushMessage ? (
            <Text style={styles.message}>{pushMessage}</Text>
          ) : null}
          {pushStatus === "denied" ? (
            <MenuRow
              icon="settings"
              title="Buka pengaturan aplikasi"
              onPress={() => {
                void Linking.openSettings();
              }}
            />
          ) : null}
          <MenuRow
            icon="logout"
            title="Keluar dari akun"
            danger
            onPress={() => {
              void handleLogout();
            }}
          />
          {loading ? <Text style={styles.message}>Sedang keluar…</Text> : null}
          {error ? <Notice tone="danger">{error}</Notice> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({
  icon,
  title,
  value,
  onPress,
  danger = false,
}: {
  icon: "badge" | "notifications" | "settings" | "logout";
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const content = (
    <>
      <View style={styles.menuIcon}>
        <SymbolView
          name={{
            ios:
              icon === "notifications"
                ? "bell.fill"
                : icon === "settings"
                  ? "gearshape.fill"
                  : icon === "logout"
                    ? "rectangle.portrait.and.arrow.right"
                    : "person.text.rectangle.fill",
            android: icon,
            web: icon,
          }}
          size={21}
          tintColor={danger ? Colors.danger : "#222222"}
        />
      </View>
      <Text style={[styles.menuTitle, danger && styles.danger]}>{title}</Text>
      {value ? (
        <Text numberOfLines={1} style={styles.menuValue}>
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
          size={21}
          tintColor="#222222"
        />
      ) : null}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={styles.menuRow}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.menuRow}>{content}</View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { paddingBottom: 24, backgroundColor: "#FFFFFF" },
  hero: {
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 30,
    backgroundColor: "#EFFBFC",
  },
  identityCard: {
    padding: 10,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2EAA9D",
  },
  identityCopy: { flex: 1, gap: 3 },
  name: { color: "#171717", fontSize: 21, fontFamily: "Outfit_700Bold" },
  email: { color: "#777777", fontSize: 13, fontFamily: "Outfit_400Regular" },
  profilePill: {
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: "#EFFBFA",
  },
  profilePillText: {
    color: "#164E49",
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
  },
  accountLine: {
    minHeight: 43,
    marginTop: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "#E4E4E4",
    borderRadius: 22,
  },
  accountLineText: {
    flex: 1,
    color: "#292929",
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
  roleSection: { paddingVertical: 25, backgroundColor: "#FFFFFF" },
  sectionTitle: {
    paddingHorizontal: 20,
    marginBottom: 15,
    color: "#171717",
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
  },
  roleScroller: { flexDirection: "row", paddingHorizontal: 12, gap: 8 },
  roleCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 132,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",
  },
  roleCardSelected: { borderColor: "#3F8F36", backgroundColor: "#327967" },
  roleCardDisabled: { opacity: 0.55, backgroundColor: "#F7F7F7" },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
  },
  roleIconSelected: { backgroundColor: "rgba(255,255,255,.18)" },
  roleTextWrap: { marginTop: 8, gap: 2, alignItems: "center" },
  roleName: { color: "#171717", fontSize: 15, fontFamily: "Outfit_700Bold" },
  roleNameSelected: { color: "#FFFFFF" },
  roleStatus: {
    color: "#747474",
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  roleStatusSelected: { color: "#DDF8EE" },
  menuSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 3,
    borderTopWidth: 10,
    borderTopColor: "#F6F6F6",
  },
  heading: {
    color: "#161616",
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
    marginBottom: 14,
  },
  menuRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIcon: { width: 30, alignItems: "center" },
  menuTitle: { color: "#202020", fontSize: 16, fontFamily: "Outfit_500Medium" },
  menuValue: {
    flex: 1,
    color: "#666666",
    fontSize: 13,
    textAlign: "right",
    fontFamily: "Outfit_400Regular",
  },
  danger: { color: Colors.danger },
  message: { color: "#6B7280", fontSize: 13, fontFamily: "Outfit_400Regular" },
});
