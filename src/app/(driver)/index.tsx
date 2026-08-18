import { useMemo as useThemeMemo , useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert, AppState, StyleSheet, Text, View } from "react-native";

import { OrderStatusBadge } from "@/components/order-status-badge";
import { orderService, serviceLabel } from "@/components/service-icon";
import {
  Button,
  Card,
  KeyValue,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import {
  getActiveRide,
  getDriverProfile,
  setDriverAvailability,
  updateDriverLocation,
} from "@/lib/api/driver-rides";
import { getApiErrorMessage } from "@/lib/api/client";
import { driverKeys } from "@/lib/driver-query-keys";
import {
  DOC_LABELS,
  SIM_FOR_VEHICLE,
  vehicleSimExpired,
} from "@/lib/driver-documents";
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
function activeOrderLabel(order: Order) {
  return `${serviceLabel(orderService(order))} aktif`;
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
      state.data ? 5_000 : profile.data?.is_online ? 10_000 : false,
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
        title={profile.data?.user.name ?? "Dashboard driver"}
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
          <Card>
            <KeyValue label="Nama" value={profile.data.user.name} />
            <KeyValue label="Rating" value={profile.data.rating} />
            <KeyValue label="Approval" value={profile.data.status} />
            <KeyValue
              label="Ketersediaan"
              value={profile.data.is_online ? "Online" : "Offline"}
            />
            {profile.data.status !== "approved" ? (
              <Text style={styles.warning}>
                Akun driver belum approved. Anda belum dapat online atau
                menerima order.
              </Text>
            ) : (
              <Button
                title={
                  profile.data.is_online ? "Jadikan Offline" : "Jadikan Online"
                }
                variant={profile.data.is_online ? "secondary" : "primary"}
                loading={availability.isPending}
                onPress={handleOnlinePress}
              />
            )}
            {simExpired ? (
              <Text style={styles.warning}>
                {expiredSimLabel} sudah kedaluwarsa. Perbarui {expiredSimLabel}{" "}
                di Dokumen &amp; SIM untuk dapat online.
              </Text>
            ) : null}
            {showPermissionExplanation && !profile.data.is_online ? (
              <View style={styles.permissionBox}>
                <Text style={styles.sectionTitle}>
                  Lokasi sepanjang waktu diperlukan
                </Text>
                <Text style={styles.muted}>
                  AnterGo menggunakan lokasi agar driver tetap dapat menerima
                  dan menjalankan pesanan ketika aplikasi berada di background
                  atau layar mati. Lokasi hanya dikirim saat status Anda Online.
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
                title="Retry Tracking"
                variant="secondary"
                loading={availability.isPending}
                onPress={requestOnline}
              />
            ) : null}
            {showPermissionExplanation && profile.data.is_online ? (
              <View style={styles.permissionBox}>
                <Text style={styles.sectionTitle}>
                  Aktifkan kembali tracking
                </Text>
                <Text style={styles.muted}>
                  Izinkan lokasi sepanjang waktu agar tracking tetap berjalan
                  saat aplikasi di background.
                </Text>
                <Button
                  title="Izinkan & Retry"
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
          </Card>
          <Card>
            <Text style={styles.sectionTitle}>Kendaraan</Text>
            <Button
              title="Kelola Kendaraan Saya"
              variant="secondary"
              onPress={() => router.push("/(driver)/vehicles")}
            />
            <KeyValue
              label="Kendaraan"
              value={
                profile.data.vehicle
                  ? `${profile.data.vehicle.brand} ${profile.data.vehicle.model}`
                  : "Belum tersedia"
              }
            />
            <KeyValue
              label="Plat nomor"
              value={profile.data.vehicle?.plate_number ?? "-"}
            />
            <KeyValue label="Tipe" value={profile.data.vehicle?.type ?? "-"} />
            <KeyValue
              label="Warna"
              value={profile.data.vehicle?.color ?? "-"}
            />
          </Card>
          <Card>
            <Text style={styles.sectionTitle}>
              {activeRide.data
                ? activeOrderLabel(activeRide.data)
                : "Order aktif"}
            </Text>
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
              <>
                <OrderStatusBadge status={activeRide.data.status} />
                <KeyValue label="Order" value={activeRide.data.order_number} />
                <KeyValue
                  label="Jemput"
                  value={activeRide.data.pickup_address ?? "-"}
                />
                <KeyValue
                  label="Tujuan"
                  value={activeRide.data.destination_address ?? "-"}
                />
                <KeyValue
                  label="Total"
                  value={formatRupiah(activeRide.data.total_price)}
                />
                <Button
                  title="Buka Order Aktif"
                  onPress={() => router.push(activeOrderPath(activeRide.data!))}
                />
              </>
            ) : (
              <Text style={styles.muted}>Tidak ada order aktif.</Text>
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  muted: { color: colors.muted, lineHeight: 20 },
  warning: { color: Colors.warning, lineHeight: 20 },
  location: { color: Colors.primaryDark, lineHeight: 20 },
  error: { color: Colors.danger, lineHeight: 20 },
  permissionBox: {
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
  },
});
