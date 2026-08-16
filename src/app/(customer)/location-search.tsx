import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppIcon } from "@/components/app-icon";
import {
  FaDotCircleIcon,
  HiLocationMarkerIcon,
} from "@/components/brand-icons";
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
import { Elevation } from "@/constants/colors";
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

// Palette from the design reference (WhatsApp Image 2026-08-16 at 17.23.35).
const ACCENT_RED = "#D03020";
// Back icon color, matching the Delivery page (send/create.tsx) HeroHeader.
const HERO_TEXT = "#1F1400";
const PIN_TEAL = "#184840";
const MINT_BG = "#E3F5E9";
// LocationCard palette copied from the Delivery page (send/create.tsx).
const PICKUP_BLUE = "#2E9BF5";
const DEST_RED = "#FA2C19";

type Candidate = {
  coordinate: Coordinate;
  title: string;
  address: string;
  distance: number | null;
  source?: "merchant" | "geoapify" | "nominatim" | "nearby";
};
function formatDistance(meters: number | null): string {
  if (meters === null) return "";
  if (meters < 1_000) return `${meters} m`;
  return `${(meters / 1_000).toFixed(1).replace(".", ",")} km`;
}
export default function LocationSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    purpose?: string;
    returnTo?: string;
  }>();
  const initialPurpose = (params.purpose ?? "ride-pickup") as LocationPurpose;
  const [purpose, setPurpose] = useState<LocationPurpose>(initialPurpose);
  const selections = useLocationPickerStore((state) => state.selections);
  const queryRef = useRef("");
  const lastSearchedRef = useRef("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const isFood = purpose === "food-destination";
  const pickupPurpose: LocationPurpose | null = isFood
    ? null
    : purpose.includes("destination")
      ? purpose.startsWith("ride")
        ? "ride-pickup"
        : "send-pickup"
      : purpose;
  const destinationPurpose: LocationPurpose = purpose.includes("pickup")
    ? purpose.startsWith("ride")
      ? "ride-destination"
      : "send-destination"
    : purpose;
  const changeQuery = (value: string) => {
    queryRef.current = value;
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setError("");
      setBusy(false);
    }
  };
  const switchPurpose = (next: LocationPurpose) => {
    if (next === purpose) return;
    setPurpose(next);
    setQuery("");
    setResults([]);
    setError("");
    queryRef.current = "";
    lastSearchedRef.current = "";
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
  // Carry the place name over with the address so picking a named result (e.g.
  // "bigmall samarinda") keeps that name instead of collapsing to the street
  // below it. Recent picks are already full addresses, so leave them untouched.
  const openMap = (candidate?: {
    coordinate: Coordinate;
    address: string;
    title?: string;
    source?: Candidate["source"];
  }) => {
    const address =
      candidate?.source &&
      candidate.title &&
      !candidate.address
        .toLowerCase()
        .startsWith(candidate.title.toLowerCase())
        ? `${candidate.title}, ${candidate.address}`
        : candidate?.address;
    router.push({
      pathname: "/(customer)/location-picker",
      params: {
        purpose,
        returnTo: params.returnTo,
        latitude: candidate?.coordinate.latitude?.toString(),
        longitude: candidate?.coordinate.longitude?.toString(),
        address,
      },
    });
  };
  // For pickup purposes the bottom action jumps straight to the user's current
  // location on the map; otherwise it opens the map with no preset marker.
  const isPickupPurpose =
    purpose === "ride-pickup" || purpose === "send-pickup";
  const openCurrentLocation = async () => {
    setBusy(true);
    try {
      const point = coordinateFromLocation(await requestCurrentLocation());
      const address = await reverseGeocodeLabel(point);
      openMap({ coordinate: point, address });
    } catch {
      openMap();
    } finally {
      setBusy(false);
    }
  };
  const search = async (raw?: string) => {
    const value = (raw ?? query).trim();
    if (!value) return;
    if (lastSearchedRef.current === value) return;
    lastSearchedRef.current = value;
    setBusy(true);
    setError("");
    try {
      // Use the current location as the search reference so results stay
      // local (radius + nearest-first); fall back to OpenStreetMap when the
      // API is unreachable.
      let reference = await getLastKnownCoordinate();
      if (!reference) {
        try {
          reference = coordinateFromLocation(await requestCurrentLocation());
        } catch {
          // Lokasi tidak tersedia — pencarian tetap jalan tanpa acuan radius.
        }
      }
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
      <View
        className="bg-background"
        style={scrolled ? { ...Elevation.floating } : undefined}
      >
        <View className="px-5 pt-5">
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            onPress={() =>
              params.returnTo
                ? router.replace(params.returnTo as never)
                : router.back()
            }
            className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
          >
            <AppIcon name="back" size={26} color={HERO_TEXT} />
          </Pressable>
          {pickupPurpose ? (
            <View className="flex-1">
              <SearchField
                marker={<FaDotCircleIcon size={16} color={PICKUP_BLUE} />}
                value={
                  purpose === pickupPurpose
                    ? query
                    : (selections[pickupPurpose]?.address ?? "")
                }
                placeholder="Pilih lokasi jemput"
                active={purpose === pickupPurpose}
                busy={busy}
                autoFocus={purpose === pickupPurpose}
                onFocus={() => switchPurpose(pickupPurpose)}
                onChangeText={changeQuery}
                onSubmit={() => {
                  Keyboard.dismiss();
                  void search();
                }}
              />
            </View>
          ) : (
            <View className="flex-1">
              <SearchField
                marker={<HiLocationMarkerIcon size={22} color={DEST_RED} />}
                value={
                  purpose === destinationPurpose
                    ? query
                    : (selections[destinationPurpose]?.address ?? "")
                }
                placeholder={isFood ? "Alamat pengantaran" : "Antar ke?"}
                active={purpose === destinationPurpose}
                busy={busy}
                autoFocus={purpose === destinationPurpose}
                onFocus={() => switchPurpose(destinationPurpose)}
                onChangeText={changeQuery}
                onSubmit={() => {
                  Keyboard.dismiss();
                  void search();
                }}
              />
            </View>
          )}
        </View>
      </View>
      <View className="relative pl-14 pr-5 pb-5 pt-2">
        {pickupPurpose ? (
          <>
            <View className="absolute left-14 top-[-7px] w-6 items-center gap-[6px]">
              <View className="h-[3px] w-[3px] rounded-full bg-[#C9CDD4]" />
              <View className="h-[3px] w-[3px] rounded-full bg-[#C9CDD4]" />
              <View className="h-[3px] w-[3px] rounded-full bg-[#C9CDD4]" />
            </View>
            <SearchField
              marker={<HiLocationMarkerIcon size={22} color={DEST_RED} />}
              value={
                purpose === destinationPurpose
                  ? query
                  : (selections[destinationPurpose]?.address ?? "")
              }
              placeholder={isFood ? "Alamat pengantaran" : "Antar ke?"}
              active={purpose === destinationPurpose}
              busy={busy}
              autoFocus={purpose === destinationPurpose}
              onFocus={() => switchPurpose(destinationPurpose)}
              onChangeText={changeQuery}
              onSubmit={() => {
                Keyboard.dismiss();
                void search();
              }}
            />
          </>
        ) : null}
      </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(event) => setScrolled(event.nativeEvent.contentOffset.y > 4)}
        contentContainerClassName="px-5"
      >
        {error ? (
          <Text className="py-2 text-sm text-danger">{error}</Text>
        ) : null}
        {list.length ? (
          <Text className="mt-2 font-extrabold text-[17px] text-foreground">
            {results.length ? "Hasil pencarian" : "Terakhir dipilih"}
          </Text>
        ) : null}
        {!list.length && !busy ? (
          <View
            className="mt-3 rounded-2xl px-4 py-8"
            style={{ backgroundColor: MINT_BG }}
          >
            <Text className="text-center text-sm leading-5 text-muted">
              Cari lokasi atau pilih langsung di Maps.
            </Text>
          </View>
        ) : (
          <View className="mt-3">
            {list.map((item, index) => (
              <Pressable
                key={`${item.coordinate.latitude}-${item.coordinate.longitude}-${index}`}
                onPress={() => openMap(item)}
                className={`flex-row items-start gap-3 py-4 active:opacity-70 ${index < list.length - 1 ? "border-b border-border" : ""}`}
              >
                <View className="mt-1">
                  <HiLocationMarkerIcon size={22} color={PIN_TEAL} />
                </View>
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    {/* Distance flows inline after the title so it always sits
                        right next to the text, even when the title is long. */}
                    <Text className="flex-1 font-bold text-base text-foreground">
                      {item.title}
                      {item.distance !== null ? (
                        <Text className="ml-1.5 font-semibold text-xs text-muted">
                          {formatDistance(item.distance)}
                        </Text>
                      ) : null}
                    </Text>
                    {item.source === "merchant" ? (
                      <Text
                        className="rounded-full px-2 py-0.5 font-bold text-[10px]"
                        style={{ backgroundColor: MINT_BG, color: PIN_TEAL }}
                      >
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
            ))}
          </View>
        )}
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-5 pb-5 pt-3">
        <Pressable
          onPress={
            isPickupPurpose ? () => void openCurrentLocation() : () => openMap()
          }
          className="min-h-12 flex-row items-center justify-center gap-2 rounded-full active:opacity-80"
          style={{ backgroundColor: MINT_BG }}
        >
          <AppIcon
            name={isPickupPurpose ? "locate" : "map"}
            size={21}
            color={PIN_TEAL}
          />
          <Text className="font-bold text-base" style={{ color: PIN_TEAL }}>
            {isPickupPurpose ? "Pilih lokasi terkini" : "Pilih di Maps"}
          </Text>
          {busy ? (
            <ActivityIndicator size="small" color={PIN_TEAL} />
          ) : null}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// Searchable location field: marker icon outside a bordered input, matching
// the theme's input style (border-border / bg-surface).
function SearchField({
  marker,
  value,
  placeholder,
  active,
  busy,
  autoFocus,
  onFocus,
  onChangeText,
  onSubmit,
}: {
  marker: ReactNode;
  value: string;
  placeholder: string;
  active: boolean;
  busy: boolean;
  autoFocus?: boolean;
  onFocus: () => void;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row items-center gap-2">
      <View
        className="w-6 items-center justify-center"
        style={active ? undefined : { opacity: 0.5 }}
      >
        {marker}
      </View>
      <View className="min-h-12 flex-1 flex-row items-center gap-2 rounded-[14px] border border-border bg-surface px-4">
        <TextInput
          autoFocus={autoFocus}
          value={value}
          onFocus={onFocus}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          className="min-h-12 flex-1 font-sans text-base text-foreground"
        />
        {busy ? (
          <ActivityIndicator size="small" color={ACCENT_RED} />
        ) : null}
      </View>
    </View>
  );
}
