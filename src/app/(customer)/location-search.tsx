import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppIcon } from "@/components/app-icon";
import {
  FaDotCircleIcon,
  HiLocationMarkerIcon,
} from "@/components/brand-icons";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors, Elevation } from "@/constants/colors";
import { apiSearchLocations } from "@/lib/api/geocode";
import {
  coordinateFromLocation,
  getLastKnownCoordinate,
  requestCurrentLocation,
  searchLocations,
  type Coordinate,
} from "@/lib/location";
import {
  type LocationPurpose,
  useLocationPickerStore,
} from "@/stores/location-picker-store";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";

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
  const { mode, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const HERO_TEXT = mode === "dark" ? "#FFFFFF" : "#1F1400";
  // Pin marker for search results: theme gray instead of the brand yellow —
  // gray in both light and dark mode (per design request).
  const PIN_GRAY = colors.muted;
  const MINT_BG = mode === "dark" ? "#1A3A30" : "#E3F5E9";
  const params = useLocalSearchParams<{
    purpose?: string;
    returnTo?: string;
  }>();
  const purposeParam = (params.purpose ?? "ride-pickup") as LocationPurpose;
  const [purpose, setPurpose] = useState<LocationPurpose>(purposeParam);
  // On web the URL params can arrive after the first render — follow the
  // tapped location (pickup/destination) as soon as they show up so the
  // matching input becomes the active one. (Adjusting state during render is
  // the React-recommended pattern for syncing state to changing props.)
  const [seenPurposeParam, setSeenPurposeParam] = useState(purposeParam);
  if (seenPurposeParam !== purposeParam) {
    setSeenPurposeParam(purposeParam);
    setPurpose(purposeParam);
  }
  const { t } = useTranslation();
  const selections = useLocationPickerStore((state) => state.selections);
  const queryRef = useRef("");
  const lastSearchedRef = useRef("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  // Which field's search is in flight (spinner shows only there), plus a
  // separate one for the "Pilih lokasi terkini" action — the two never show at
  // the same time.
  const [busyPurpose, setBusyPurpose] = useState<LocationPurpose | null>(null);
  const [busyLocation, setBusyLocation] = useState(false);
  const [error, setError] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const isSinglePurpose =
    purpose === "food-destination" || purpose.startsWith("jastip-");
  const pickupPurpose: LocationPurpose | null = isSinglePurpose
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
      setBusyPurpose(null);
    }
  };
  const switchPurpose = (next: LocationPurpose) => {
    if (next === purpose) return;
    setPurpose(next);
    setQuery("");
    setResults([]);
    setError("");
    setBusyPurpose(null);
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
  // The bottom action is the same for every purpose — "Pilih di peta". It
  // jumps straight to the map: when this purpose already has a saved
  // location, the pin lands there (no reset to the current location);
  // otherwise it uses the location captured at app startup, and only fetches
  // a fresh fix when none was ever stored.
  const openMapAtCurrentLocation = () => {
    const state = useLocationPickerStore.getState();
    const saved = state.selections[purpose];
    if (saved) {
      openMap({ coordinate: saved.coordinate, address: saved.address });
      return;
    }
    const point = state.currentLocation;
    if (point) {
      openMap({ coordinate: point.coordinate, address: point.address });
      return;
    }
    setBusyLocation(true);
    void state
      .refreshCurrentLocation()
      .then((fresh) => {
        if (fresh) openMap({ coordinate: fresh.coordinate, address: fresh.address });
        else openMap();
      })
      .finally(() => setBusyLocation(false));
  };
  const search = async (raw?: string) => {
    const value = (raw ?? query).trim();
    if (!value) return;
    if (lastSearchedRef.current === value) return;
    lastSearchedRef.current = value;
    const searchedPurpose = purpose;
    setBusyPurpose(searchedPurpose);
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
        setError(t("location.notFound"));
    } catch {
      if (queryRef.current.trim() !== value) return;
      setError(
        "Pencarian lokasi belum tersedia. Kamu tetap dapat memilih langsung di Maps.",
      );
    } finally {
      // Only clear the spinner if this search is still the one in charge — a
      // newer search (same text in the other field) must keep its spinner.
      if (queryRef.current.trim() === value) {
        setBusyPurpose((current) =>
          current === searchedPurpose ? null : current,
        );
      }
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
  // The tab navigator keeps this screen mounted between visits, so the search
  // state would otherwise linger (e.g. a typed query after backing out without
  // picking anything). Reset it every time the screen is focused again.
  useFocusEffect(
    useCallback(() => {
      setQuery("");
      setResults([]);
      setError("");
      setBusyPurpose(null);
      queryRef.current = "";
      lastSearchedRef.current = "";
    }, []),
  );

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
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            // Return to the screen the flow started from (the caller always
            // passes returnTo). This screen is pushed on the customer stack, so
            // dismissTo pops back to the target route and drops this screen; on
            // web the stack history contains the pushed screen, so the pop is
            // reliable. Falls back to router.back() when no returnTo was given.
            onPress={() =>
              params.returnTo
                ? router.dismissTo(params.returnTo as never)
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
                placeholder={
                  pickupPurpose === "send-pickup"
                    ? t("location.sendPickup")
                    : t("location.topRidePickup")
                }
                active={purpose === pickupPurpose}
                busy={busyPurpose === pickupPurpose}
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
                marker={
                  purpose === "jastip-purchase" ? (
                    <FaDotCircleIcon size={16} color={PICKUP_BLUE} />
                  ) : (
                    <HiLocationMarkerIcon size={22} color={DEST_RED} />
                  )
                }
                value={
                  purpose === destinationPurpose
                    ? query
                    : (selections[destinationPurpose]?.address ?? "")
                }
                placeholder={
                  purpose === "food-destination"
                    ? t("location.foodDest")
                    : purpose === "jastip-purchase"
                      ? t("jastip.whereToBuy")
                      : purpose === "jastip-destination"
                        ? t("jastip.deliverTo")
                        : purpose.startsWith("ride")
                          ? t("location.topRideDest")
                          : t("location.topSendDest")
                }
                active={purpose === destinationPurpose}
                busy={busyPurpose === destinationPurpose}
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
              placeholder={
                purpose === "food-destination"
                  ? "Alamat pengantaran"
                  : purpose.startsWith("ride")
                    ? "Mau ke mana?"
                    : "Antar ke?"
              }
              active={purpose === destinationPurpose}
              busy={busyPurpose === destinationPurpose}
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
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(event) => setScrolled(event.nativeEvent.contentOffset.y > 4)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
      >
        {error ? (
          <Text className="py-2 text-sm text-danger">{error}</Text>
        ) : null}
        {list.length ? (
          <Text className="mt-2 font-extrabold text-[17px] text-foreground">
            {results.length ? t("location.searchResults") : t("location.lastSelected")}
          </Text>
        ) : null}
        {!list.length && !busyPurpose && !busyLocation ? (
          <View
            className="mt-3 rounded-2xl px-4 py-8"
            style={{ backgroundColor: MINT_BG }}
          >
            <Text className="text-center text-sm leading-5 text-muted">
              {t("location.searchHint")}
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
                  <HiLocationMarkerIcon size={22} color={PIN_GRAY} />
                </View>
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <View className="min-w-0 flex-1 flex-row items-baseline gap-2">
                      <Text
                        numberOfLines={1}
                        className="shrink font-bold text-base text-foreground"
                      >
                        {item.title}
                      </Text>
                      {item.distance !== null ? (
                        <Text className="shrink-0 font-semibold text-xs text-muted">
                          {formatDistance(item.distance)}
                        </Text>
                      ) : null}
                    </View>
                    {item.source === "merchant" ? (
                      <Text
                        className="rounded-full px-2 py-0.5 font-bold text-[10px]"
                        style={{ backgroundColor: MINT_BG, color: Colors.primary }}
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
      <View
        className="items-center bg-background px-5 pt-3"
        style={{
          flexShrink: 0,
          paddingBottom: Math.max(insets.bottom, 12) + 8,
        }}
      >
        <Pressable
          onPress={openMapAtCurrentLocation}
          className="flex-row items-center justify-center gap-1 self-center rounded-full px-3 py-1 active:opacity-80"
          style={{ backgroundColor: mode === "dark" ? "#423500" : "#FFF9E6" }}
        >
          <AppIcon
            name="map"
            size={16}
            color={mode === "dark" ? "#FFFFFF" : Colors.primaryDark}
          />
          <Text className="text-sm" style={{ color: mode === "dark" ? "#FFFFFF" : Colors.primaryDark }}>
            {t("location.pickOnMap")}
          </Text>
          {busyLocation ? (
            <ActivityIndicator size="small" color={mode === "dark" ? "#FFFFFF" : Colors.primaryDark} />
          ) : null}
        </Pressable>
      </View>
      </KeyboardAvoidingView>
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
  const inputRef = useRef<TextInput>(null);
  // autoFocus only applies when the input first mounts; refocus whenever this
  // field becomes the active purpose so the tapped location (pickup or
  // destination) is always the one receiving input, even when the URL params
  // arrive after the first render on web.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);
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
          ref={inputRef}
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
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : null}
      </View>
    </View>
  );
}
