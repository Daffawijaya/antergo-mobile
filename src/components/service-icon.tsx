import { StyleSheet, Text, View } from "react-native";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Colors, Radius, Spacing, Typography } from "@/constants/colors";
import type { Order, ServiceVariant } from "@/types/api";
export function orderService(
  order: Pick<Order, "type" | "service_variant">,
): ServiceVariant {
  return (
    order.service_variant ??
    (order.type === "ride"
      ? "bike"
      : order.type === "send"
        ? "delivery"
        : "food")
  );
}
const service = {
  bike: { label: "Motor", icon: "bike" as AppIconName },
  car: { label: "Mobil", icon: "car" as AppIconName },
  delivery: { label: "Kirim", icon: "package" as AppIconName },
  food: { label: "Makanan", icon: "utensils" as AppIconName },
  shopping: { label: "Belanja", icon: "bag" as AppIconName },
} as const;
export function ServiceIcon({
  type,
  size = 46,
}: {
  type: ServiceVariant;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.icon,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <AppIcon
        name={service[type].icon}
        size={size * 0.46}
        color={Colors.primaryDark}
      />
    </View>
  );
}
export function ServiceLabel({ type }: { type: ServiceVariant }) {
  return (
    <View style={styles.label}>
      <ServiceIcon type={type} size={24} />
      <Text style={styles.labelText}>{service[type].label}</Text>
    </View>
  );
}
export function serviceLabel(type: ServiceVariant) {
  return service[type].label;
}
const styles = StyleSheet.create({
  icon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
  },
  label: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  labelText: { color: Colors.text, ...Typography.caption },
});
