import { StyleSheet, Text } from "react-native";
import { Colors, Radius, Typography } from "@/constants/colors";
import type { OrderStatus } from "@/types/api";
import { useTranslation, type TranslationKey } from "@/i18n";
const STATUS_KEYS: Record<OrderStatus, TranslationKey> = {
  pending: "status.pending",
  searching_driver: "status.searchingDriver",
  driver_assigned: "status.driverAssigned",
  driver_arrived: "status.driverArrived",
  merchant_confirmed: "status.merchantConfirmed",
  preparing: "status.preparing",
  ready_for_pickup: "status.readyForPickup",
  picked_up: "status.pickedUp",
  in_progress: "status.inProgress",
  delivering: "status.delivering",
  completed: "status.completed",
  cancelled: "status.cancelled",
};
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const cancelled = status === "cancelled";
  const completed = status === "completed";
  return (
    <Text
      style={[
        styles.badge,
        completed && styles.completed,
        cancelled && styles.cancelled,
      ]}
    >
      {t(STATUS_KEYS[status])}
    </Text>
  );
}
const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    overflow: "hidden",
    backgroundColor: Colors.primarySoft,
    color: Colors.primaryDark,
    ...Typography.caption,
  },
  completed: { backgroundColor: Colors.successSoft, color: Colors.success },
  cancelled: { backgroundColor: Colors.dangerSoft, color: Colors.danger },
});
