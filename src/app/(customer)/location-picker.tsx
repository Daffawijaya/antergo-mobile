import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import {
  FaDotCircleIcon,
  HiLocationMarkerIcon,
} from "@/components/brand-icons";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  InteractionManager,
  Keyboard,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LocationPickerMap, type PlaceData, type RegionBounds } from "@/components/location-picker-map";
import { BackButton } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { apiNearbyMerchants, type MapBounds } from "@/lib/api/geocode";
import { filterViewportMarkers } from "@/lib/viewport-markers";
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
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation, type TranslationKey } from "@/i18n";

const LABEL_KEYS: Record<LocationPurpose, { title: TranslationKey; cta: TranslationKey }> = {
  "ride-pickup": { title: "location.ridePickup", cta: "location.ridePickupCta" },
  "ride-destination": { title: "location.rideDest", cta: "location.rideDestCta" },
  "send-pickup": { title: "location.sendPickup", cta: "location.sendPickupCta" },
  "send-destination": { title: "location.sendDest", cta: "location.sendDestCta" },
  "jastip-purchase": { title: "jastip.whereToBuy", cta: "common.confirm" },
  "jastip-destination": { title: "jastip.deliverTo", cta: "common.confirm" },
  "food-destination": { title: "location.foodDest", cta: "location.foodDestCta" },
};

const TOP_LABEL_KEYS: Record<LocationPurpose, TranslationKey> = {
  "ride-pickup": "location.topRidePickup",
  "ride-destination": "location.topRideDest",
  "send-pickup": "location.topSendPickup",
  "send-destination": "location.topSendDest",
  "jastip-purchase": "jastip.whereToBuy",
  "jastip-destination": "jastip.deliverTo",
  "food-destination": "location.topFoodDest",
};

// Marker colors/icons matching the search fields and result list on the
// location search screen. The picked-location pin is theme gray (gray in
// both light and dark mode, per design request).
const PICKUP_BLUE = "#2E9BF5";
const DEST_RED = "#FA2C19";

// The counterpart location of a pickup/destination purpose, so after confirming
// one side the flow can move on to the other. Food has no counterpart.
const OTHER_PURPOSES: Partial<Record<LocationPurpose, LocationPurpose>> = {
  "ride-pickup": "ride-destination",
  "ride-destination": "ride-pickup",
  "send-pickup": "send-destination",
  "send-destination": "send-pickup",
};
export default function LocationPickerScreen() {
  const router = useRouter();
  const { mode, colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    purpose?: string;
    returnTo?: string;
    latitude?: string;
    longitude?: string;
    address?: string;
  }>();
  const purpose = (params.purpose ?? "ride-pickup") as LocationPurpose;
  const isPickup =
    purpose === "ride-pickup" ||
    purpose === "send-pickup" ||
    purpose === "jastip-purchase";
  const selections = useLocationPickerStore((state) => state.selections);
  const previous = selections[purpose];
  const setSelection = useLocationPickerStore((state) => state.setSelection);
  const setNextPurpose = useLocationPickerStore((state) => state.setNextPurpose);
  const initial =
    params.latitude && params.longitude
      ? {
          latitude: Number(params.latitude),
          longitude: Number(params.longitude),
        }
      : previous?.coordinate;
  const [coordinate, setCoordinate] = useState<Coordinate | undefined>(initial);
  const { t } = useTranslation();
  // Nearby merchants shown as store pins on the map
  const [merchants, setMerchants] = useState<PlaceData[]>([]);
  const merchantTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleBounds = useRef<RegionBounds | null>(null);
  const currentZoom = useRef(16);
  const [address, setAddress] = useState(
    params.address ?? previous?.address ?? t("location.dragToSet"),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SCREEN_HEIGHT = Dimensions.get("window").height;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const topTranslateY = useRef(new Animated.Value(-80)).current;
  const bottomTranslateY = useRef(new Animated.Value(300)).current;

  const leaving = useRef(false);

  // Masuk: seluruh layar fade-in, card atas slide dari atas, card bawah
  // dari bawah.
  useEffect(() => {
    Keyboard.dismiss();
    const enter = Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(topTranslateY, { toValue: 0, damping: 20, stiffness: 120, mass: 0.8, useNativeDriver: true }),
      Animated.spring(bottomTranslateY, { toValue: 0, damping: 20, stiffness: 120, mass: 0.8, useNativeDriver: true }),
    ]);
    const task = InteractionManager.runAfterInteractions(() => enter.start());
    return () => task.cancel();
  }, [screenOpacity, topTranslateY, bottomTranslateY]);

  // Keluar: seluruh layar fade-out menyingkap halaman cari lokasi yang tetap
  // ter-mount di bawahnya, card slide keluar, lalu pop setelah selesai.
  const exitScreen = useCallback(
    (navigate: () => void) => {
      if (leaving.current) return;
      leaving.current = true;
      Animated.parallel([
        Animated.timing(screenOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(topTranslateY, { toValue: -80, duration: 220, useNativeDriver: true }),
        Animated.timing(bottomTranslateY, { toValue: 320, duration: 220, useNativeDriver: true }),
      ]).start(() => navigate());
    },
    [screenOpacity, topTranslateY, bottomTranslateY],
  );

  const animateBack = useCallback(() => {
    exitScreen(() => router.back());
  }, [exitScreen, router]);

  // Setelah lokasi dikonfirmasi, langsung ke halaman fitur — pop peta dan
  // halaman cari lokasi sekaligus, tanpa memperlihatkan search sebentar.
  const goBackToForm = useCallback(() => {
    if (!params.returnTo) {
      router.dismiss(2);
      return;
    }
    const [pathname, qs] = params.returnTo.split("?");
    const parsed = Object.fromEntries(new URLSearchParams(qs ?? ""));
    router.dismissTo(
      (Object.keys(parsed).length
        ? { pathname, params: parsed }
        : { pathname }) as never,
    );
  }, [params.returnTo, router]);

  useEffect(() => {
    const handler = () => { animateBack(); return true; };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, [animateBack]);
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
    setAddress(t("location.searchingAddress"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void updateAddress(point), 500);
  };

  const onRegionChange = (bounds: RegionBounds) => {
    visibleBounds.current = bounds;
    // Fetch when map stops moving
    if (merchantTimer.current) clearTimeout(merchantTimer.current);
    merchantTimer.current = setTimeout(() => void fetchMerchants(bounds), 600);
  };

  const onZoomChange = (zoom: number) => {
    currentZoom.current = zoom;
  };

  // Filter markers based on zoom level + viewport bounds for even spread
  const visibleMerchants = useMemo(() => {
    if (!visibleBounds.current || !merchants.length) return merchants;
    return filterViewportMarkers(merchants, visibleBounds.current, currentZoom.current);
  }, [merchants]);

  const fetchMerchants = async (bounds: MapBounds) => {
    try {
      const merchantResults = await apiNearbyMerchants(bounds, 50);

      setMerchants(
        merchantResults.map((m) => ({
          id: `merchant-${m.id}`,
          coordinate: m.coordinate,
          name: m.name,
          color: Colors.primary,
          icon: "store",
        })),
      );
    } catch {
      // Silently ignore — overlays are a nice-to-have
    }
  };

  const onPlacePress = (place: PlaceData) => {
    setCoordinate(place.coordinate);
    setAddress(place.name);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (merchantTimer.current) clearTimeout(merchantTimer.current);
    },
    [],
  );
  // Fetch nearby merchants once when we have an initial coordinate
  useEffect(() => {
    if (initial) {
      const d = 0.005;
      void fetchMerchants({
        sw: { latitude: initial.latitude - d, longitude: initial.longitude - d },
        ne: { latitude: initial.latitude + d, longitude: initial.longitude + d },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
          : t("location.currentUnavailable"),
      );
    } finally {
      setBusy(false);
    }
  };
  const confirm = () => {
    if (!coordinate) {
      setError(t("location.selectFirst"));
      return;
    }
    setSelection(purpose, { coordinate, address });
    const other = OTHER_PURPOSES[purpose];
    if (other && !selections[other]) {
      // Lokasi satunya belum ada — kembali (beranimasi) ke halaman cari
      // tempat yang masih ter-mount di bawah, lalu aktifkan input purpose
      // berikutnya lewat handoff store.
      setNextPurpose(other);
      exitScreen(() => router.back());
      return;
    }
    // Lokasi terakhir: langsung ke halaman fitur tanpa menunggu animasi —
    // kalau menunggu, halaman search di bawah sempat terlihat sebentar.
    goBackToForm();
  };
  return (
    <Animated.View
      style={{ flex: 1, backgroundColor: colors.background, opacity: screenOpacity }}
    >
      <View style={{ flex: 1 }}>
        <LocationPickerMap
          coordinate={coordinate}
          onChange={mapChanged}
          onRegionChange={onRegionChange}
          onZoomChange={onZoomChange}
          places={visibleMerchants}
          onPlacePress={onPlacePress}
        />
        <Animated.View
          className="flex-row items-center gap-2"
          style={{ position: "absolute", left: 20, right: 20, top: Math.max(insets.top + 8, 24), transform: [{ translateY: topTranslateY }] }}
        >
          <BackButton
            floating
            onPress={animateBack}
          />
          <View className="min-h-12 flex-1 flex-row items-center gap-2 rounded-xl bg-surface px-4 shadow-md">
            {isPickup ? (
              <FaDotCircleIcon size={16} color={PICKUP_BLUE} />
            ) : (
              <HiLocationMarkerIcon size={22} color={DEST_RED} />
            )}
            <Text numberOfLines={1} className="flex-1 text-sm text-muted">
              {t(TOP_LABEL_KEYS[purpose])}
            </Text>
          </View>
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            right: 20,
            bottom: 155,
            transform: [{ translateY: bottomTranslateY }],
          }}
        >
          <Pressable
            onPress={() => void gps()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface shadow-md"
          >
            <AppIcon
              name="locate"
              size={23}
              color={mode === "dark" ? "#FFFFFF" : "#000000"}
            />
          </Pressable>
        </Animated.View>
        <Animated.View
          className="rounded-t-[28px] bg-surface px-5 pt-4 elevation-lg"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingBottom: Math.max(insets.bottom, 20),
            transform: [{ translateY: bottomTranslateY }],
          }}
        >
          <View className="mb-4 flex-row items-center gap-3">
            <HiLocationMarkerIcon size={28} color={colors.muted} />
            <View style={{ flex: 1 }}>
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
            className={`min-h-12 py-3.5 items-center justify-center rounded-full bg-brand ${!coordinate || busy ? "opacity-50" : "active:opacity-80"}`}
          >
            <Text className="font-bold text-base text-on-brand">
              {t(LABEL_KEYS[purpose].cta)}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
