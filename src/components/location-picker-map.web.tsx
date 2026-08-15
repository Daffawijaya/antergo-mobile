import { Text, View } from "react-native";
import type { Coordinate } from "@/lib/location";
export function LocationPickerMap({
  coordinate,
}: {
  coordinate?: Coordinate;
  onChange: (value: Coordinate) => void;
}) {
  return (
    <View className="flex-1 items-center justify-center bg-emerald-50 px-8 dark:bg-emerald-950/30">
      <Text className="font-bold text-lg text-foreground">Pratinjau Maps</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-muted">
        Peta interaktif tersedia pada aplikasi Android dan iOS.
      </Text>
      {coordinate ? (
        <Text className="mt-3 font-semibold text-brand">
          Lokasi siap dikonfirmasi.
        </Text>
      ) : null}
    </View>
  );
}
