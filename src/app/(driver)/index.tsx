import { useMemo as useThemeMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert, AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { orderService, ServiceLabel } from "@/components/service-icon";
import {
  Button,
  Card,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import {
  getActiveRide,
  getDriverProfile,
  listAvailableRides,
  setDriverAvailability,
  updateDriverLocation,
} from "@/lib/api/driver-rides";
import { getApiErrorMessage } from "@/lib/api/client";
import { driverKeys } from "@/lib/driver-query-keys";
import { DOC_LABELS, SIM_FOR_VEHICLE, vehicleSimExpired } from "@/lib/driver-documents";
import { formatRupiah } from "@/lib/format";
import {
  setDriverTrackingMode,
  startDriverBackgroundTracking,
  stopDriverLocationTracking,
} from "@/lib/driver-location-service";
import {
  BackgroundLocationPermissionError,
  LocationPermissionError,
  LocationUnavailableError,
  requestCurrentLocation,
  requestDriverTrackingPermissions,
} from "@/lib/location";
import { useDriverLocationStore } from "@/stores/driver-location-store";
import type { Order } from "@/types/api";
import { useAppTheme } from "@/stores/theme-store";

function activeOrderPath(order: Order) {
  if (order.type === "food")
    return {
      pathname: "/(driver)/food/[id]" as const,
      params: { id: String(order.id) },
    };
  if (order.type === "send")
    return {
      pathname: "/(driver)/send/[id]" as const,
      params: { id: String(order.id) },
    };
  return {
    pathname: "/(driver)/ride/[id]" as const,
    params: { id: String(order.id) },
  };
}

export default function DriverHome() {
  const { styles } = useScreenStyles();
  const router = useRouter();
  const client = useQueryClient();
  const [showPermissionExplanation, setShowPermissionExplanation] =
    useState(false);
  const locationStatus = useDriverLocationStore((state) => state.status);
  const locationMessage = useDriverLocationStore((state) => state.message);
  const setLocationState = useDriverLocationStore(
    (state) => state.setLocationState,
  );

  const profile = useQuery({
    queryKey: driverKeys.profile,
    queryFn: getDriverProfile,
  });

  const activeRide = useQuery({
    queryKey: driverKeys.active,
    queryFn: getActiveRide,
    enabled: !!profile.data,
    refetchInterval: ({ state }) =>
      state.data ? 10_000 : profile.data?.is_online ? 15_000 : false,
  });

  const canReceive = profile.data?.status === "approved" && profile.data.is_online;

  const available = useQuery({
    queryKey: driverKeys.available,
    queryFn: listAvailableRides,
    enabled: canReceive && !activeRide.data,
    refetchInterval: canReceive && !activeRide.data ? 10_000 : false,
  });

  const availability = useMutation({
    mutationFn: async (online: boolean) => {
      if (!online) {
        await stopDriverLocationTracking();
        setLocationState("idle");
        return setDriverAvailability(false);
      }

      setLocationState("requesting", "Meminta izin lokasi foreground…");
      await requestDriverTrackingPermissions();
      setLocationState("locating", "Mengirim lokasi awal ke server…");
      const location = await requestCurrentLocation();
      const driver = await setDriverAvailability(true);
      try {
        await updateDriverLocation(location);
        await setDriverTrackingMode(
          AppState.currentState === "active" ? "foreground" : "background",
        );
        await startDriverBackgroundTracking();
        setLocationState(
          AppState.currentState === "active" ? "foreground" : "background",
          AppState.currentState === "active"
            ? "Lokasi aktif."
            : "Background tracking aktif.",
        );
        return driver;
      } catch (error) {
        await stopDriverLocationTracking();
        try {
          await setDriverAvailability(false);
        } catch {
          /* preserve original tracking error */
        }
        throw error;
      }
    },
    onSuccess: async (driver) => {
      setShowPermissionExplanation(false);
      client.setQueryData(driverKeys.profile, (current: typeof profile.data) =>
        current ? { ...current, ...driver } : current,
      );
      await client.invalidateQueries({ queryKey: driverKeys.available });
    },
    onError: (error) => {
      if (
        error instanceof BackgroundLocationPermissionError ||
        error instanceof LocationPermissionError
      )
        setLocationState("permission_required", error.message);
      else if (error instanceof LocationUnavailableError)
        setLocationState("unavailable", error.message);
      else setLocationState("error", getApiErrorMessage(error));
    },
  });

  const activeVehicle = profile.data?.vehicle ?? null;
  const simExpired = activeVehicle
    ? vehicleSimExpired(profile.data?.documents, activeVehicle.type)
    : false;
  const expiredSimLabel = activeVehicle
    ? DOC_LABELS[SIM_FOR_VEHICLE[activeVehicle.type]]
    : "SIM";

  const requestOnline = () => setShowPermissionExplanation(true);
  const confirmOnline = () => availability.mutate(true);

  const handleOnlinePress = () => {
    if (profile.data!.is_online) {
      availability.mutate(false);
      return;
    }
    if (simExpired) {
      Alert.alert(
        `${expiredSimLabel} sudah kedaluwarsa`,
        "Perbarui SIM Anda di menu Dokumen & SIM sebelum dapat online.",
        [
          {
            text: "Perbarui SIM",
            onPress: () => router.push("/(driver)/documents"),
          },
          { text: "Batal", style: "cancel" },
        ],
      );
      return;
    }
    requestOnline();
  };

  const isTrackingError = [
    "permission_required",
    "unavailable",
    "error",
  ].includes(locationStatus);

  return (
    <Screen>
      <PageHeader
        eyebrow="Driver"
        title={profile.data?.user.name ?? "Beranda driver"}
        description="Kelola kesiapan dan perjalanan aktif."
      />

      {profile.isLoading ? (
        <StatusState type="loading" />
      ) : profile.isError ? (
        <StatusState
          type="error"
          title="Profil driver tidak tersedia"
          message={getApiErrorMessage(profile.error)}
          action={
            <Button
              title="Coba lagi"
              variant="secondary"
              onPress={() => profile.refetch()}
            />
          }
        />
      ) : profile.data ? (
        <>
          {/* ── Online / Offline Toggle ── */}
          <Card>
            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <View
                  style={[
                    styles.statusDot,
                    profile.data.is_online ? styles.dotOnline : styles.dotOffline,
                  ]}
                />
                <View>
                  <Text style={styles.statusLabel}>
                    {profile.data.is_online ? "Online" : "Offline"}
                  </Text>
                  <Text style={styles.statusSub}>
                    {profile.data.is_online
                      ? "Siap menerima pesanan"
                      : "Aktifkan untuk menerima pesanan"}
                  </Text>
                </View>
              </View>
              {profile.data.status !== "approved" ? (
                <Text style={styles.warning}>
                  Akun belum disetujui. Anda belum dapat online.
                </Text>
              ) : (
                <Button
                  title={profile.data.is_online ? "Offline" : "Online"}
                  variant={profile.data.is_online ? "secondary" : "primary"}
                  loading={availability.isPending}
                  onPress={handleOnlinePress}
                />
              )}
            </View>

            {showPermissionExplanation && !profile.data.is_online ? (
              <View style={styles.permissionBox}>
                <Text style={styles.sectionTitle}>
                  Lokasi sepanjang waktu diperlukan
                </Text>
                <Text style={styles.muted}>
                  anterGo menggunakan lokasi agar driver tetap dapat menerima
                  dan menjalankan pesanan ketika aplikasi berada di background
                  atau layar mati.
                </Text>
                <Button
                  title="Izinkan & Online"
                  loading={availability.isPending}
                  onPress={confirmOnline}
                />
                <Button
                  title="Batal"
                  variant="secondary"
                  onPress={() => setShowPermissionExplanation(false)}
                />
              </View>
            ) : null}

            {locationStatus !== "idle" ? (
              <Text style={[styles.location, isTrackingError && styles.error]}>
                {locationMessage ?? `Status lokasi: ${locationStatus}`}
              </Text>
            ) : null}

            {profile.data.is_online && isTrackingError ? (
              <Button
                title="Coba Lagi"
                variant="secondary"
                loading={availability.isPending}
                onPress={requestOnline}
              />
            ) : null}
          </Card>

          {/* ── Order Aktif ── */}
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pesanan Aktif</Text>
              {activeRide.data ? (
                <OrderStatusBadge status={activeRide.data.status} />
              ) : null}
            </View>

            {activeRide.isLoading ? (
              <StatusState type="loading" />
            ) : activeRide.isError ? (
              <StatusState
                type="error"
                message={getApiErrorMessage(activeRide.error)}
                action={
                  <Button
                    title="Coba lagi"
                    variant="secondary"
                    onPress={() => activeRide.refetch()}
                  />
                }
              />
            ) : activeRide.data ? (
              <Pressable
                onPress={() => router.push(activeOrderPath(activeRide.data!))}
                style={({ pressed }) => [
                  styles.activeOrderCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.activeOrderTop}>
                  <ServiceLabel type={orderService(activeRide.data)} />
                  <Text style={styles.activePrice}>
                    {formatRupiah(activeRide.data.total_price)}
                  </Text>
                </View>

                <View style={styles.routeSection}>
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, styles.pickupDot]} />
                    <Text style={styles.routeLabel}>Jemput</Text>
                  </View>
                  <Text style={styles.routeAddress} numberOfLines={1}>
                    {activeRide.data.pickup_address ?? "—"}
                  </Text>

                  <View style={styles.routeArrow}>
                    <AppIcon name="down" size={14} color={Colors.primaryDark} />
                  </View>

                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, styles.destDot]} />
                    <Text style={styles.routeLabel}>Tujuan</Text>
                  </View>
                  <Text style={styles.routeAddress} numberOfLines={1}>
                    {activeRide.data.destination_address ?? "—"}
                  </Text>
                </View>

                <View style={styles.activeOrderBottom}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {activeRide.data.user?.name ?? "Pelanggan"}
                  </Text>
                  <Button
                    compact
                    title="Lanjutkan"
                    onPress={() => router.push(activeOrderPath(activeRide.data!))}
                  />
                </View>
              </Pressable>
            ) : (
              <Text style={styles.muted}>Tidak ada pesanan aktif.</Text>
            )}
          </Card>

          {/* ── Preview Order Tersedia ── */}
          {canReceive && !activeRide.data ? (
            <Card>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pesanan Tersedia</Text>
                <Pressable
                  onPress={() => router.push("/(driver)/orders")}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.seeAll}>Lihat Semua</Text>
                </Pressable>
              </View>

              {available.isLoading ? (
                <StatusState type="loading" />
              ) : available.isError ? (
                <StatusState
                  type="error"
                  message={getApiErrorMessage(available.error)}
                />
              ) : !available.data?.length ? (
                <Text style={styles.muted}>Belum ada pesanan di sekitar.</Text>
              ) : (
                available.data.slice(0, 3).map((order) => (
                  <Pressable
                    key={order.id}
                    onPress={() => router.push(
                      order.type === "food"
                        ? { pathname: "/(driver)/food/[id]", params: { id: String(order.id) } }
                        : order.type === "send"
                          ? { pathname: "/(driver)/send/[id]", params: { id: String(order.id) } }
                          : { pathname: "/(driver)/ride/[id]", params: { id: String(order.id) } }
                    )}
                    style={({ pressed }) => [
                      styles.previewCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.previewTop}>
                      <ServiceLabel type={orderService(order)} />
                      <Text style={styles.previewPrice}>
                        {formatRupiah(order.total_price)}
                      </Text>
                    </View>
                    <Text style={styles.previewRoute} numberOfLines={1}>
                      {order.pickup_address ?? "Jemput"} → {order.destination_address ?? "Tujuan"}
                    </Text>
                    {order.pickup_distance != null && order.pickup_distance > 0 ? (
                      <Text style={styles.previewDistance}>
                        {order.pickup_distance} km dari Anda
                      </Text>
                    ) : null}
                  </Pressable>
                ))
              )}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    /* Status toggle */
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    statusInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    dotOnline: {
      backgroundColor: Colors.success,
    },
    dotOffline: {
      backgroundColor: colors.muted,
    },
    statusLabel: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    statusSub: {
      color: colors.muted,
      fontSize: 13,
    },
    warning: {
      color: Colors.warning,
      lineHeight: 20,
      fontSize: 13,
    },

    /* Section */
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },
    seeAll: {
      color: Colors.primaryDark,
      fontSize: 14,
      fontWeight: "600",
    },

    /* Active order card */
    activeOrderCard: {
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.primary,
      backgroundColor: colors.surfaceMuted,
    },
    activeOrderTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    activePrice: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
    },
    routeSection: {
      gap: 4,
    },
    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    routeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    pickupDot: {
      backgroundColor: Colors.primary,
    },
    destDot: {
      backgroundColor: Colors.danger,
    },
    routeLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    routeAddress: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 14,
    },
    routeArrow: {
      marginLeft: 2,
      marginVertical: 2,
    },
    activeOrderBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    customerName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
    },

    /* Preview order card */
    previewCard: {
      gap: 6,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    previewTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    previewPrice: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    previewRoute: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    previewDistance: {
      color: colors.muted,
      fontSize: 12,
    },

    /* Shared */
    muted: {
      color: colors.muted,
      lineHeight: 20,
    },
    location: {
      color: Colors.primaryDark,
      lineHeight: 20,
      fontSize: 13,
    },
    error: {
      color: Colors.danger,
      lineHeight: 20,
    },
    permissionBox: {
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: Colors.primarySoft,
      marginTop: 10,
    },
    pressed: {
      opacity: 0.72,
    },
  });
