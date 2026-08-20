import { StyleSheet, Text, View } from "react-native";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Colors, Radius, Spacing, Typography } from "@/constants/colors";
import type { Order, ServiceVariant } from "@/types/api";
import { useTranslation, type TranslationKey } from "@/i18n";
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
  bike: { icon: "bike" as AppIconName, labelKey: "service.motor" as TranslationKey },
  car: { icon: "car" as AppIconName, labelKey: "service.car" as TranslationKey },
  delivery: { icon: "package" as AppIconName, labelKey: "service.delivery" as TranslationKey },
  food: { icon: "utensils" as AppIconName, labelKey: "service.food" as TranslationKey },
  shopping: { icon: "bag" as AppIconName, labelKey: "service.shopping" as TranslationKey },
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
  const { t } = useTranslation();
  return (
    <View style={styles.label}>
      <ServiceIcon type={type} size={24} />
      <Text style={styles.labelText}>{t(service[type].labelKey)}</Text>
    </View>
  );
}
export function serviceLabelKey(type: ServiceVariant): TranslationKey {
  return service[type].labelKey;
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
