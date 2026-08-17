import { Pressable, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";

export function LocationHeader({
  location,
  onBack,
}: {
  location: { value?: string; placeholder: string; onPress: () => void };
  onBack: () => void;
}) {
  return (
    <View className="mt-2 flex-row items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kembali"
        onPress={onBack}
        className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
      >
        <AppIcon name="back" size={26} color="#FFFFFF" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={location.onPress}
        className="ml-1 flex-1"
      >
        <Text
          className="text-xs font-medium leading-4"
          style={{ color: "rgba(255, 255, 255, 0.75)" }}
        >
          Antar sekarang
        </Text>
        <Text
          numberOfLines={1}
          className="font-bold text-lg leading-6"
          style={{ color: "#FFFFFF" }}
        >
          {location.value || location.placeholder}
        </Text>
      </Pressable>
    </View>
  );
}
