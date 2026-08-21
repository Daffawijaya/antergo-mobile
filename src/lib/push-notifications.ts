import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { registerPushToken } from "@/lib/api/push-notifications";
import { usePushNotificationStore } from "@/stores/push-notification-store";

const PROMPTED_KEY = "antergo_notification_prompted";

export const isNativePushAvailable =
  Platform.OS !== "web" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export async function getNotificationsModule() {
  if (!isNativePushAvailable) return null;
  return import("expo-notifications");
}

if (isNativePushAvailable)
  void getNotificationsModule().then((Notifications) =>
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    }),
  );

export async function syncPushRegistration(requestPermission: boolean) {
  const setState = usePushNotificationStore.getState().setPushState;
  if (!isNativePushAvailable)
    return setState(
      "unavailable",
      "Push notification tersedia pada Development Build Android/iOS.",
    );
  if (!Device.isDevice)
    return setState(
      "unavailable",
      "Push notification memerlukan perangkat fisik.",
    );

  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Status Pesanan",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#208AEF",
    });
  }

  setState("requesting", "Memeriksa izin notifikasi…");
  let permission = await Notifications.getPermissionsAsync();
  if (requestPermission && permission.status !== "granted") {
    await AsyncStorage.setItem(PROMPTED_KEY, "1");
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== "granted")
    return setState(
      "denied",
      "Izin notifikasi diperlukan agar update order dapat diterima.",
    );

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId)
    return setState(
      "error",
      "EAS projectId belum tersedia. Jalankan eas init lalu buat ulang Development Build.",
    );

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    await registerPushToken(token, Platform.OS as "android" | "ios");
    setState("registered", "Notifikasi order aktif.");
  } catch (error) {
    setState(
      "error",
      error instanceof Error ? error.message : "Push token gagal didaftarkan.",
    );
  }
}

export async function shouldRequestPushPermission() {
  return (await AsyncStorage.getItem(PROMPTED_KEY)) !== "1";
}
