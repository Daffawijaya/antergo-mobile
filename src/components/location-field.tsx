import { Pressable, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { HiLocationMarkerIcon } from "@/components/brand-icons";
import { Colors } from "@/constants/colors";
import { useAppTheme } from "@/stores/theme-store";

// Merah tujuan, senada dengan halaman Kirim.
const DEST_RED = "#FA2C19";

export function LocationRouteCard({
  pickup,
  destination,
}: {
  pickup: {
    label: string;
    value?: string;
    placeholder: string;
    onPress: () => void;
  };
  destination: {
    label: string;
    value?: string;
    placeholder: string;
    onPress: () => void;
  };
}) {
  return (
    <View className="rounded-2xl bg-surface px-4 py-2 elevation-sm">
      <LocationRow {...pickup} kind="pickup" />
      <View className="ml-5 h-3 w-0.5 bg-border" />
      <LocationRow {...destination} kind="destination" />
    </View>
  );
}
export function LocationField(props: {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <View className="rounded-xl border border-border bg-surface px-3">
      <LocationRow {...props} kind="pickup" />
    </View>
  );
}
export function LocationRow({
  label,
  value,
  placeholder,
  onPress,
  kind,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
  kind: "pickup" | "destination";
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[68px] flex-row items-center gap-3 active:opacity-70"
    >
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${kind === "pickup" ? "bg-surface-muted" : "bg-surface-muted"}`}
      >
        {kind === "destination" ? (
          <HiLocationMarkerIcon size={22} color={DEST_RED} />
        ) : (
          <AppIcon name="pin" size={22} color={Colors.primary} />
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold text-xs text-muted">{label}</Text>
        <Text
          numberOfLines={2}
          className={`font-semibold text-[15px] leading-5 ${value ? "text-foreground" : "text-muted"}`}
        >
          {value || placeholder}
        </Text>
      </View>
      <AppIcon name="forward" size={19} color={colors.muted} />
    </Pressable>
  );
}
