import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { apiSearchLocations } from "@/lib/api/geocode";
import {
  coordinateFromLocation,
  getLastKnownCoordinate,
  requestCurrentLocation,
  reverseGeocodeLabel,
  searchLocations,
  type Coordinate,
} from "@/lib/location";
import {
  type LocationPurpose,
  useLocationPickerStore,
} from "@/stores/location-picker-store";
import { useAppTheme } from "@/stores/theme-store";

type Candidate = {
  coordinate: Coordinate;
  title: string;
  address: string;
  distance: number | null;
  source?: "merchant" | "geoapify" | "nominatim";
};
function formatDistance(meters: number | null): string {
  if (meters === null) return "";
  if (meters < 1_000) return `${meters} m`;
  return `${(meters / 1_000).toFixed(1).replace(".", ",")} km`;
}
const TITLES: Record<LocationPurpose, string> = {
  "ride-pickup": "Lokasi jemput",
  "ride-destination": "Tujuan",
  "send-pickup": "Lokasi pengambilan",
  "send-destination": "Lokasi penerima",
  "food-destination": "Alamat pengantaran",
};
export default function LocationSearchScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{
    purpose?: string;
    returnTo?: string;
  }>();
  const purpose = (params.purpose ?? "ride-pickup") as LocationPurpose;
  const selections = useLocationPickerStore((state) => state.selections);
  const queryRef = useRef("");
  const lastSearchedRef = useRef("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changeQuery = (value: string) => {
    queryRef.current = value;
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setError("");
      setBusy(false);
    }
  };
  const recent = useMemo(() => {
    const seen = new Set<string>();
    return Object.values(selections)
      .filter((item) => {
        if (!item || seen.has(item.address)) return false;
        seen.add(item.address);
        return true;
      })
      .slice(0, 4) as { coordinate: Coordinate; address: string }[];
  }, [selections]);
  const openMap = (candidate?: { coordinate: Coordinate; address: string }) =>
    router.push({
      pathname: "/(customer)/location-picker",
      params: {
        purpose,
        returnTo: params.returnTo,
        latitude: candidate?.coordinate.latitude?.toString(),
        longitude: candidate?.coordinate.longitude?.toString(),
        address: candidate?.address,
      },
    });
  const search = async (raw?: string) => {
    const value = (raw ?? query).trim();
    if (!value) return;
    if (lastSearchedRef.current === value) return;
    lastSearchedRef.current = value;
    setBusy(true);
    setError("");
    try {
      // Try the backend first (Indonesia-only + nearest-first), fall back to
      // a direct OpenStreetMap search when the API is unreachable.
      const reference = await getLastKnownCoordinate();
      let found: Candidate[];
      try {
        const viaApi = await apiSearchLocations(value, reference);
        found = viaApi.map((item) => ({
          coordinate: item.coordinate,
          title: item.name,
          address: item.address,
          distance: item.distance,
          source: item.source,
        }));
      } catch {
        const local = await searchLocations(value);
        found = local.map((item) => ({
          coordinate: item.coordinate,
          title: item.name,
          address: item.address,
          distance: null,
          source: undefined,
        }));
      }
      if (queryRef.current.trim() !== value) return;
      setResults(found);
      if (!found.length)
        setError("Lokasi tidak ditemukan. Coba kata kunci yang lebih lengkap.");
    } catch {
      if (queryRef.current.trim() !== value) return;
      setError(
        "Pencarian lokasi belum tersedia. Kamu tetap dapat memilih langsung di Maps.",
      );
    } finally {
      if (queryRef.current.trim() === value) setBusy(false);
    }
  };
  // Search as the user types (debounced) instead of waiting for the keyboard's
  // search key, which is easy to miss on web.
  useEffect(() => {
    const value = query.trim();
    if (!value) {
      lastSearchedRef.current = "";
      return;
    }
    if (lastSearchedRef.current === value) return;
    if (value.length < 2) return;
    const timer = setTimeout(() => void search(value), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  const currentLocation = async () => {
    setBusy(true);
    setError("");
    try {
      const coordinate = coordinateFromLocation(await requestCurrentLocation());
      openMap({ coordinate, address: await reverseGeocodeLabel(coordinate) });
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
  const list = results.length
    ? results
    : recent.map((item) => ({
        ...item,
        title: item.address.split(",")[0],
        distance: null,
        source: undefined,
      }));
  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <View className="flex-row items-center gap-2 px-3 py-2">
        <BackButton
          onPress={() =>
            params.returnTo
              ? router.replace(params.returnTo as never)
              : router.back()
          }
        />
        <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4">
          <AppIcon name="search" size={21} color={colors.muted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={changeQuery}
            onSubmitEditing={() => {
              Keyboard.dismiss();
              void search();
            }}
            returnKeyType="search"
            placeholder="Cari lokasi..."
            placeholderTextColor={colors.muted}
            className="min-h-12 flex-1 font-sans text-base text-foreground"
          />
          {busy ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : null}
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pb-28 pt-4"
      >
        <Text className="font-bold text-xl text-foreground">
          {TITLES[purpose]}
        </Text>
        <Pressable
          onPress={() => void currentLocation()}
          className="mt-4 flex-row items-center gap-3 border-b border-border py-4"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
            <AppIcon name="locate" size={21} color={Colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-base text-foreground">
              Lokasi saat ini
            </Text>
            <Text className="text-sm text-muted">Gunakan GPS perangkat</Text>
          </View>
        </Pressable>
        {error ? (
          <Text className="py-4 text-sm text-danger">{error}</Text>
        ) : null}
        <Text className="mt-6 font-bold text-lg text-foreground">
          {results.length
            ? "Hasil pencarian"
            : recent.length
              ? "Terakhir dipilih"
              : "Rekomendasi"}
        </Text>
        {!list.length && !busy ? (
          <Text className="py-8 text-center text-sm text-muted">
            Belum ada lokasi terbaru. Cari lokasi atau pilih langsung di Maps.
          </Text>
        ) : (
          list.map((item, index) => (
            <Pressable
              key={`${item.coordinate.latitude}-${item.coordinate.longitude}-${index}`}
              onPress={() => openMap(item)}
              className="flex-row items-start gap-3 border-b border-border py-4"
            >
              <AppIcon name="pin" size={25} color={Colors.primary} />
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="flex-shrink font-bold text-base text-foreground">
                    {item.title}
                  </Text>
                  {item.distance !== null ? (
                    <Text className="font-semibold text-xs text-muted">
                      {formatDistance(item.distance)}
                    </Text>
                  ) : null}
                  {item.source === "merchant" ? (
                    <Text className="rounded-full bg-brand/10 px-2 py-0.5 font-bold text-[10px] text-brand">
                      Merchant
                    </Text>
                  ) : null}
                </View>
                <Text
                  numberOfLines={2}
                  className="text-sm leading-5 text-muted"
                >
                  {item.address}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-5 pb-5 pt-3">
        <Pressable
          onPress={() => openMap()}
          className="min-h-12 flex-row items-center justify-center gap-2 rounded-full bg-brand active:opacity-80"
        >
          <AppIcon name="map" size={21} color={Colors.onPrimary} />
          <Text className="font-bold text-base text-on-brand">Pilih di Maps</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
