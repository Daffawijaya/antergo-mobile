import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
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
  bike: {
    label: "Bike",
    icon: {
      ios: "motorcycle.fill",
      android: "two_wheeler",
      web: "two_wheeler",
    },
  },
  car: {
    label: "Car",
    icon: { ios: "car.fill", android: "directions_car", web: "directions_car" },
  },
  delivery: {
    label: "Delivery",
    icon: { ios: "shippingbox.fill", android: "package_2", web: "package_2" },
  },
  food: {
    label: "Food",
    icon: { ios: "fork.knife", android: "restaurant", web: "restaurant" },
  },
  shopping: {
    label: "Shopping",
    icon: { ios: "bag.fill", android: "shopping_bag", web: "shopping_bag" },
  },
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
      <SymbolView
        name={service[type].icon}
        size={size * 0.46}
        tintColor={Colors.primary}
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
