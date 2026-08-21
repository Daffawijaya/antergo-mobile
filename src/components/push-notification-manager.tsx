import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import {
  getNotificationsModule,
  isNativePushAvailable,
  shouldRequestPushPermission,
  syncPushRegistration,
} from "@/lib/push-notifications";
import { useAuthStore } from "@/stores/auth-store";
import { usePushNotificationStore } from "@/stores/push-notification-store";
import type { AppRole, PushNotificationData } from "@/types/api";

const ROLE_BY_ROUTE: Record<PushNotificationData["route"], AppRole> = {
  customer_ride_detail: "customer",
  customer_food_detail: "customer",
  customer_send_detail: "customer",
  driver_ride_detail: "driver",
  driver_food_detail: "driver",
  driver_send_detail: "driver",
  customer_chat: "customer",
  driver_chat: "driver",
  merchant_food_detail: "merchant",
};

function isPushData(
  data: Record<string, unknown>,
): data is unknown & PushNotificationData {
  return (
    typeof data.type === "string" &&
    typeof data.order_id === "number" &&
    typeof data.order_type === "string" &&
    typeof data.route === "string" &&
    data.route in ROLE_BY_ROUTE
  );
}

async function openNotification(data: Record<string, unknown>) {
  if (!isPushData(data)) return;
  const auth = useAuthStore.getState();
  const role = ROLE_BY_ROUTE[data.route];
  if (!auth.user?.roles.includes(role)) return;
  if (auth.activeRole !== role) await auth.setActiveRole(role);

  const params = { id: String(data.order_id) };
  setTimeout(() => {
    switch (data.route) {
      case "customer_ride_detail":
        router.push({ pathname: "/(customer)/ride/[id]", params });
        break;
      case "customer_food_detail":
        router.push({ pathname: "/(customer)/food/order/[id]", params });
        break;
      case "customer_send_detail":
        router.push({ pathname: "/(customer)/send/[id]", params });
        break;
      case "driver_ride_detail":
        router.push({ pathname: "/(driver)/ride/[id]", params });
        break;
      case "driver_food_detail":
        router.push({ pathname: "/(driver)/food/[id]", params });
        break;
      case "driver_send_detail":
        router.push({ pathname: "/(driver)/send/[id]", params });
        break;
      case "customer_chat":
        router.push({ pathname: "/(customer)/chat/[id]", params });
        break;
      case "driver_chat":
        router.push({ pathname: "/(driver)/chat/[id]", params });
        break;
      case "merchant_food_detail":
        router.push({ pathname: "/(merchant)/orders/[id]", params });
        break;
    }
  }, 50);
}

export function PushNotificationManager() {
  const userId = useAuthStore((state) => state.user?.id);
  const setRetry = usePushNotificationStore((state) => state.setRetry);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    let tokenSubscription: { remove(): void } | undefined;
    let responseSubscription: { remove(): void } | undefined;
    const retry = () => syncPushRegistration(true);

    setRetry(retry);
    void shouldRequestPushPermission().then((request) =>
      syncPushRegistration(request),
    );

    if (Platform.OS !== "web" && isNativePushAvailable) {
      void getNotificationsModule().then((Notifications) => {
        if (!active || !Notifications) return;

        tokenSubscription = Notifications.addPushTokenListener(() => {
          void syncPushRegistration(false);
        });
        responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            void openNotification(
              response.notification.request.content.data ?? {},
            );
          });
        void Notifications.getLastNotificationResponseAsync().then((response) => {
          if (response)
            void openNotification(
              response.notification.request.content.data ?? {},
            );
        });
      });
    }

    return () => {
      active = false;
      tokenSubscription?.remove();
      responseSubscription?.remove();
      setRetry(null);
    };
  }, [setRetry, userId]);

  return null;
}
