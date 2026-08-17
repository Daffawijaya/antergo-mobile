import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { HiLocationMarkerIcon } from "@/components/brand-icons";

export function HeroHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <View className="mb-4 mt-2 flex-row items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kembali"
        onPress={onBack}
        className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
      >
        <AppIcon name="back" size={26} color="#FFFFFF" />
      </Pressable>
      <Text
        className="font-bold text-[22px] leading-7"
        style={{ color: "#FFFFFF" }}
      >
        {title}
      </Text>
    </View>
  );
}

export function LocationCard({
  location,
}: {
  location: { value?: string; placeholder: string; onPress: () => void };
}) {
  return (
    <View className="rounded-2xl bg-surface px-4 py-4 elevation-md">
      <Text className="ml-9 text-xs font-medium text-muted">
        Antar sekarang
      </Text>
      <LocationRow
        marker={<HiLocationMarkerIcon size={22} color="#FA2C19" />}
        value={location.value}
        placeholder={location.placeholder}
        onPress={location.onPress}
      />
    </View>
  );
}

function LocationRow({
  marker,
  value,
  placeholder,
  onPress,
}: {
  marker: ReactNode;
  value?: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center active:opacity-70"
    >
      <View className="w-6 items-center justify-center">{marker}</View>
      <Text
        numberOfLines={1}
        className={`ml-3 flex-1 text-[15px] leading-5 ${value ? "font-bold text-foreground" : "font-medium text-muted"}`}
      >
        {value || placeholder}
      </Text>
    </Pressable>
  );
}
