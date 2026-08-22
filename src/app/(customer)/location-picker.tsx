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
import { apiNearbyMerchants, apiNearbyPlaces, type MapBounds } from "@/lib/api/geocode";
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
  const animating = useRef(false);
  const SCREEN_HEIGHT = Dimensions.get("window").height;
  const mapOpacity = useRef(new Animated.Value(0)).current;
  const topTranslateY = useRef(new Animated.Value(-80)).current;
  const bottomTranslateY = useRef(new Animated.Value(300)).current;

  const animateBack = useCallback(() => {
    if (animating.current) return;
    animating.current = true;
    Animated.parallel([
      Animated.timing(mapOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(topTranslateY, { toValue: -80, duration: 250, useNativeDriver: true }),
      Animated.timing(bottomTranslateY, { toValue: 300, duration: 250, useNativeDriver: true }),
    ]).start(() => router.back());
  }, [mapOpacity, topTranslateY, bottomTranslateY, router]);

  useEffect(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(mapOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(topTranslateY, { toValue: 0, damping: 20, stiffness: 120, mass: 0.8, useNativeDriver: true }),
      Animated.spring(bottomTranslateY, { toValue: 0, damping: 20, stiffness: 120, mass: 0.8, useNativeDriver: true }),
    ]).start();
  }, [mapOpacity, topTranslateY, bottomTranslateY]);

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
      const center: Coordinate = {
        latitude: (bounds.sw.latitude + bounds.ne.latitude) / 2,
        longitude: (bounds.sw.longitude + bounds.ne.longitude) / 2,
      };
      const [merchantResults, placeResults] = await Promise.allSettled([
        apiNearbyMerchants(bounds, 25),
        apiNearbyPlaces(center, 10),
      ]);

      const pins: PlaceData[] = [];

      // App merchants (DB) — green store pins
      if (merchantResults.status === "fulfilled") {
        for (const m of merchantResults.value) {
          pins.push({
            id: `merchant-${m.id}`,
            coordinate: m.coordinate,
            name: m.name,
            color: Colors.primary,
            icon: "store",
          });
        }
      }

      // Geoapify POIs (Big Mall, mosques, schools, etc.) — blue landmark pins
      if (placeResults.status === "fulfilled") {
        for (const p of placeResults.value) {
          if (pins.some((pin) => pin.name.toLowerCase() === p.name.toLowerCase())) continue;
          pins.push({
            id: `place-${p.name}-${p.coordinate.latitude}`,
            coordinate: p.coordinate,
            name: p.name,
            color: "#6366F1",
            icon: "pin",
          });
        }
      }

      setMerchants(pins);
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
  const animateOutAnd = (cb: () => void) => {
    if (animating.current) return;
    animating.current = true;
    Animated.parallel([
      Animated.timing(mapOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(topTranslateY, { toValue: -80, duration: 250, useNativeDriver: true }),
      Animated.timing(bottomTranslateY, { toValue: 300, duration: 250, useNativeDriver: true }),
    ]).start(() => cb());
  };
  const confirm = () => {
    if (!coordinate) {
      setError(t("location.selectFirst"));
      return;
    }
    setSelection(purpose, { coordinate, address });
    const other = OTHER_PURPOSES[purpose];
    if (other && !selections[other]) {
      animateOutAnd(() =>
        router.dismissTo({
          pathname: "/(customer)/location-search",
          params: { purpose: other, returnTo: params.returnTo },
        }),
      );
      return;
    }
    if (params.returnTo) animateOutAnd(() => router.dismissTo(params.returnTo as never));
    else animateBack();
  };
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: mapOpacity }}>
          <LocationPickerMap
            coordinate={coordinate}
            onChange={mapChanged}
            onRegionChange={onRegionChange}
            onZoomChange={onZoomChange}
            places={visibleMerchants}
            onPlacePress={onPlacePress}
          />
        </Animated.View>
        <Animated.View
          className="flex-row items-center gap-2"
          style={{ position: "absolute", left: 20, right: 20, top: Math.max(insets.top + 8, 24), transform: [{ translateY: topTranslateY }] }}
        >
          <BackButton
            floating
            onPress={animateBack}
          />
          <View className="min-h-12 flex-1 flex-row items-center gap-2 rounded-xl bg-surface px-4 elevation-md">
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
        <Pressable
          onPress={() => void gps()}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface elevation-md"
          style={{ position: "absolute", right: 20, bottom: 168 }}
        >
          <AppIcon
            name="locate"
            size={23}
            color={mode === "dark" ? "#FFFFFF" : "#000000"}
          />
        </Pressable>
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
            <Text className="font-bold text-base text-white">
              {t(LABEL_KEYS[purpose].cta)}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
