import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LocationPickerMap } from "@/components/location-picker-map";
import { BackButton } from "@/components/ui";
import { Colors } from "@/constants/colors";
import {
  coordinateFromLocation,
  requestCurrentLocation,
  reverseGeocodeLabel,
  type Coordinate,
} from "@/lib/location";
import {
  type LocationPurpose,
  useLocationPickerStore,
} from "@/stores/location-picker-store";

const LABELS: Record<LocationPurpose, { title: string; cta: string }> = {
  "ride-pickup": { title: "Lokasi jemput", cta: "Pilih lokasi jemput" },
  "ride-destination": {
    title: "Tujuan perjalanan",
    cta: "Pilih lokasi tujuan",
  },
  "send-pickup": {
    title: "Lokasi pengambilan",
    cta: "Pilih lokasi pengambilan",
  },
  "send-destination": {
    title: "Lokasi penerima",
    cta: "Pilih lokasi penerima",
  },
  "food-destination": { title: "Alamat pengantaran", cta: "Pilih alamat ini" },
};
export default function LocationPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    purpose?: string;
    returnTo?: string;
    latitude?: string;
    longitude?: string;
    address?: string;
  }>();
  const purpose = (params.purpose ?? "ride-pickup") as LocationPurpose;
  const previous = useLocationPickerStore((state) => state.selections[purpose]);
  const setSelection = useLocationPickerStore((state) => state.setSelection);
  const initial =
    params.latitude && params.longitude
      ? {
          latitude: Number(params.latitude),
          longitude: Number(params.longitude),
        }
      : previous?.coordinate;
  const [coordinate, setCoordinate] = useState<Coordinate | undefined>(initial);
  const [address, setAddress] = useState(
    params.address ?? previous?.address ?? "Geser peta untuk menentukan lokasi",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // On web the URL params may not be available on the very first render, so
  // pick up the search-selected location as soon as it arrives and make the
  // map go straight there (adjusting state during render is the React-recommended
  // pattern for syncing state to changing props).
  const paramsKey = `${params.latitude ?? ""}|${params.longitude ?? ""}|${params.address ?? ""}`;
  const [seenParamsKey, setSeenParamsKey] = useState("");
  if (seenParamsKey !== paramsKey) {
    setSeenParamsKey(paramsKey);
    if (params.latitude && params.longitude) {
      setCoordinate({
        latitude: Number(params.latitude),
        longitude: Number(params.longitude),
      });
    }
    if (params.address) setAddress(params.address);
  }
  const updateAddress = async (point: Coordinate) => {
    setBusy(true);
    try {
      setAddress(await reverseGeocodeLabel(point));
    } finally {
      setBusy(false);
    }
  };
  const mapChanged = (point: Coordinate) => {
    setCoordinate(point);
    setAddress("Mencari alamat…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void updateAddress(point), 500);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const gps = async () => {
    setError("");
    setBusy(true);
    try {
      const point = coordinateFromLocation(await requestCurrentLocation());
      setCoordinate(point);
      await updateAddress(point);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Lokasi saat ini tidak tersedia.",
      );
    } finally {
      setBusy(false);
    }
  };
  const confirm = () => {
    if (!coordinate) {
      setError("Pilih lokasi terlebih dahulu.");
      return;
    }
    setSelection(purpose, { coordinate, address });
    if (params.returnTo) router.replace(params.returnTo as never);
    else router.back();
  };
  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <View className="flex-1">
        <LocationPickerMap coordinate={coordinate} onChange={mapChanged} />
        <View className="absolute left-3 right-3 top-3 flex-row items-center gap-2">
          <BackButton
            floating
            onPress={() =>
              params.returnTo
                ? router.replace(params.returnTo as never)
                : router.back()
            }
          />
          <View className="min-h-12 flex-1 justify-center rounded-2xl bg-surface px-4 elevation-md">
            <Text className="font-bold text-sm text-foreground">
              {LABELS[purpose].title}
            </Text>
            <Text numberOfLines={1} className="text-sm text-muted">
              {busy ? "Mencari alamat…" : address}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => void gps()}
          className="absolute bottom-44 right-4 h-12 w-12 items-center justify-center rounded-full bg-surface elevation-md"
        >
          <AppIcon name="locate" size={23} color={Colors.primary} />
        </Pressable>
        <View className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-surface px-5 pb-5 pt-4 elevation-lg">
          <View className="mb-4 flex-row items-start gap-3">
            <AppIcon name="pin" size={28} color={Colors.primary} />
            <View className="flex-1">
              <Text className="font-bold text-base text-foreground">
                {address.split(",")[0]}
              </Text>
              <Text
                numberOfLines={2}
                className="mt-1 text-sm leading-5 text-muted"
              >
                {address}
              </Text>
            </View>
            {busy ? <ActivityIndicator color={Colors.primary} /> : null}
          </View>
          {error ? (
            <Text className="mb-3 text-sm text-danger">{error}</Text>
          ) : null}
          <Pressable
            disabled={!coordinate || busy}
            onPress={confirm}
            className={`min-h-13 items-center justify-center rounded-full bg-brand ${!coordinate || busy ? "opacity-50" : "active:opacity-80"}`}
          >
            <Text className="font-bold text-base text-on-brand">
              {LABELS[purpose].cta}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
