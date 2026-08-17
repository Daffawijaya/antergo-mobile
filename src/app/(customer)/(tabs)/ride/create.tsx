import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { AppIcon } from "@/components/app-icon";
import {
  FaChevronRightIcon,
  FaDotCircleIcon,
  HiLocationMarkerIcon,
} from "@/components/brand-icons";
import { Button, FormField, Notice, Screen } from "@/components/ui";
import { createRide } from "@/lib/api/rides";
import { getApiErrorMessage } from "@/lib/api/client";
import { orderKeys } from "@/lib/query-keys";
import { createRideSchema, type CreateRideForm } from "@/schemas/ride";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import { useAppTheme } from "@/stores/theme-store";
import type { ApiErrorPayload } from "@/types/api";

const defaults: CreateRideForm = {
  pickup_address: "",
  pickup_latitude: "",
  pickup_longitude: "",
  destination_address: "",
  destination_latitude: "",
  destination_longitude: "",
  notes: "",
};

// LocationCard palette copied from the Delivery page (send/create.tsx).
const PICKUP_BLUE = "#2E9BF5";
const DEST_RED = "#FA2C19";

// Per-service hero icon. Each require() must stay a static literal so
// Metro can bundle it; the selection happens on the resolved modules.
const SERVICE_ICONS = {
  car: require("../../../../../assets/images/icon/carr.png"),
  bike: require("../../../../../assets/images/icon/bikee.png"),
} as const;

// Bike brand gradient: right end is the brand yellow, getting darker toward
// the left (same shape/contrast as the Delivery hero gradient).
const BIKE_GRADIENT = {
  light: { from: "#D99600", to: "#FFB900" },
  dark: { from: "#332600", to: "#453600" },
} as const;

// Bottom edge of the brand hero: a single smooth wave, mirroring the
// reference SVG `M0,100 C150,200 350,0 500,100` — one cubic curve across
// the full width that dips on the left, crosses the middle at the center
// and rises on the right, so the two halves stay symmetric.
// (Reference: https://stackoverflow.com/a/56012973, CC BY-SA 4.0)
function buildWavePath(
  width: number,
  heroHeight: number,
  fillBottom: number,
): string {
  const amplitude = Math.min(20, Math.max(12, width * 0.044));
  // Lift the wave a little above the hero's bottom edge so it floats
  // instead of touching the very bottom of the hero.
  const lift = 14;
  const middle = heroHeight - amplitude - lift;
  // The white fill runs from the wave all the way down to the bottom of
  // the screen so no yellow shows below the wave.
  const bottom = fillBottom;
  // A single cubic only reaches ~29% of its control-point offset, so the
  // control points sit ~3.46× farther than the visible amplitude — the
  // reference does the same (its controls sit far outside the visible band).
  const controlAmplitude = amplitude * 3.464;
  return [
    `M 0,${bottom}`,
    `L ${width},${bottom}`,
    `L ${width},${middle}`,
    `C ${width * 0.7},${middle - controlAmplitude}, ${width * 0.3},${middle + controlAmplitude}, 0,${middle}`,
    "Z",
  ].join(" ");
}

export default function CreateRideScreen() {
  const router = useRouter();
  const { service } = useLocalSearchParams<{ service?: string }>();
  const serviceType = service === "car" ? "car" : "bike";
  const serviceLabel = serviceType === "car" ? "Car" : "Bike";
  // Promo copy follows the service: bike sells on price (hemat), car on
  // comfort (nyaman).
  const promoTitle = serviceType === "car" ? "Perjalanan Nyaman" : "Perjalanan Hemat";
  const promoSubtitle =
    serviceType === "car" ? "Driver siap antar" : "Driver siap jemput";
  const promoSubtitle2 =
    serviceType === "car" ? "dengan armada premium" : "di lokasi kamu";
  const queryClient = useQueryClient();
  const pickup = useLocationPickerStore((s) => s.selections["ride-pickup"]);
  const destination = useLocationPickerStore(
    (s) => s.selections["ride-destination"],
  );
  // Fill the pickup instantly from the stored current location when this
  // screen gains focus with an empty pickup. The current location is captured
  // at app startup and refreshed whenever the user leaves with a moved pickup,
  // so re-entering shows it immediately — no waiting for GPS.
  useFocusEffect(
    useCallback(() => {
      if (useLocationPickerStore.getState().selections["ride-pickup"]) return;
      let cancelled = false;
      void (async () => {
        const state = useLocationPickerStore.getState();
        const point =
          state.currentLocation ?? (await state.refreshCurrentLocation());
        if (cancelled || !point) return;
        useLocationPickerStore
          .getState()
          .setSelection("ride-pickup", point);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateRideForm>({
    resolver: zodResolver(createRideSchema),
    defaultValues: defaults,
  });
  useEffect(() => {
    if (pickup) {
      setValue("pickup_address", pickup.address, { shouldValidate: true });
      setValue("pickup_latitude", String(pickup.coordinate.latitude), {
        shouldValidate: true,
      });
      setValue("pickup_longitude", String(pickup.coordinate.longitude), {
        shouldValidate: true,
      });
    }
  }, [pickup, setValue]);
  useEffect(() => {
    if (destination) {
      setValue("destination_address", destination.address, {
        shouldValidate: true,
      });
      setValue(
        "destination_latitude",
        String(destination.coordinate.latitude),
        { shouldValidate: true },
      );
      setValue(
        "destination_longitude",
        String(destination.coordinate.longitude),
        { shouldValidate: true },
      );
    }
  }, [destination, setValue]);
  const mutation = useMutation({
    mutationFn: createRide,
    onSuccess: async ({ order }) => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      router.replace({
        pathname: "/(customer)/(tabs)/ride/[id]",
        params: { id: String(order.id) },
      });
    },
  });
  const submit = handleSubmit((values) =>
    mutation.mutate(
      {
        pickup_address: values.pickup_address.trim(),
        pickup_latitude: Number(values.pickup_latitude),
        pickup_longitude: Number(values.pickup_longitude),
        destination_address: values.destination_address.trim(),
        destination_latitude: Number(values.destination_latitude),
        destination_longitude: Number(values.destination_longitude),
        notes: values.notes.trim() || null,
        service_type: serviceType,
      },
      {
        onError: (error) => {
          if (!isAxiosError<ApiErrorPayload>(error)) return;
          Object.entries(error.response?.data?.errors ?? {}).forEach(
            ([field, messages]) => {
              if (field in defaults)
                setError(field as keyof CreateRideForm, {
                  type: "server",
                  message: messages[0],
                });
            },
          );
        },
      },
    ),
  );
  const openPicker = (purpose: "ride-pickup" | "ride-destination") =>
    router.push({
      pathname: "/(customer)/location-search",
      params: {
        purpose,
        returnTo: `/(customer)/(tabs)/ride/create?service=${service}`,
      },
    });
  const swapLocations = () => {
    const state = useLocationPickerStore.getState();
    const currentPickup = state.selections["ride-pickup"];
    const currentDestination = state.selections["ride-destination"];
    if (!currentPickup || !currentDestination) return;
    state.setSelection("ride-pickup", currentDestination);
    state.setSelection("ride-destination", currentPickup);
  };
  const { mode, colors } = useAppTheme();
  const [heroWidth, setHeroWidth] = useState(0);
  const [heroHeight, setHeroHeight] = useState(0);
  // Bottom edge of the form content (= bottom of the "Cari Driver" button,
  // the last element). The white wave fill extends down to here so nothing
  // yellow peeks out between the wave and the button.
  const [formBottom, setFormBottom] = useState(0);
  const waveFillBottom = formBottom > 0 ? formBottom : heroHeight || 300;
  // Sticky header: once the hero header has scrolled off the top, show a
  // white bar with black text that stays pinned to the top of the screen.
  const insets = useSafeAreaInsets();
  const [heroHeaderBottom, setHeroHeaderBottom] = useState(0);
  const [sticky, setSticky] = useState(false);
  const handleBack = () => {
    // Jika lokasi jemput digeser/diubah user (bukan lagi lokasi terkini), reset
    // dan langsung ambil posisi terkini — jadi saat halaman dibuka lagi lokasi
    // jemput sudah terisi lokasi sekarang tanpa nunggu. Lokasi jemput yang
    // masih lokasi terkini (tidak digeser) tetap dipertahankan. Lokasi antar
    // selalu direset.
    const state = useLocationPickerStore.getState();
    const pickup = state.selections["ride-pickup"];
    const current = state.currentLocation;
    const moved =
      !!pickup &&
      (!current ||
        pickup.coordinate.latitude !== current.coordinate.latitude ||
        pickup.coordinate.longitude !== current.coordinate.longitude);
    if (moved) {
      state.clearSelection("ride-pickup");
      void state.refreshCurrentLocation();
    }
    state.clearSelection("ride-destination");
    reset();
    router.back();
  };
  const locationError =
    errors.pickup_address?.message ||
    errors.pickup_latitude?.message ||
    errors.destination_address?.message ||
    errors.destination_latitude?.message;
  const gradient = BIKE_GRADIENT[mode];
  // White reads best on the (darker) brand-yellow hero.
  const heroColor = "#FFFFFF";

  return (
    <Screen
      padded={false}
      className="gap-0 bg-background"
      onScroll={(event) => {
        const y = event.nativeEvent.contentOffset.y;
        const shouldStick = heroHeaderBottom > 0 && y >= heroHeaderBottom;
        setSticky((prev) => (prev === shouldStick ? prev : shouldStick));
      }}
      header={
        sticky ? (
          <View
            className="px-5 py-5"
            style={{
              position: "absolute",
              top: insets.top,
              left: 0,
              right: 0,
              backgroundColor: colors.background,
            }}
          >
            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kembali"
                onPress={handleBack}
                className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
              >
                <AppIcon
                  name="back"
                  size={26}
                  color={mode === "dark" ? "#FFFFFF" : "#000000"}
                />
              </Pressable>
              <Text
                className="font-bold text-[22px] leading-7"
                style={{ color: mode === "dark" ? "#FFFFFF" : "#000000" }}
              >
                {serviceLabel}
              </Text>
            </View>
          </View>
        ) : null
      }
    >
      <View
        className="px-5 pb-6 pt-2"
        onLayout={(event) => {
          setHeroWidth(event.nativeEvent.layout.width);
          // The wave is the hero's bottom edge, so it must sit below all of
          // the hero's content (header, location card, promo + bike image).
          setHeroHeight(event.nativeEvent.layout.height);
        }}
      >
        <Svg
          width="100%"
          height={waveFillBottom}
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        >
          <Defs>
            <LinearGradient
              id="bike-hero"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <Stop offset="0%" stopColor={gradient.from} />
              <Stop offset="100%" stopColor={gradient.to} />
            </LinearGradient>
          </Defs>
          {/* The yellow only covers the hero itself; everything below the
              wave is the white fill running to the bottom of the screen. */}
          <Rect width="100%" height={heroHeight || 300} fill="url(#bike-hero)" />
          {heroWidth > 0 ? (
            <Path
              d={buildWavePath(heroWidth, heroHeight || 300, waveFillBottom)}
              fill={colors.background}
            />
          ) : null}
        </Svg>
        <View
          onLayout={(event) =>
            setHeroHeaderBottom(
              event.nativeEvent.layout.y + event.nativeEvent.layout.height,
            )
          }
        >
          <HeroHeader title={serviceLabel} onBack={handleBack} />
        </View>
        <LocationCard
          pickup={{
            value: pickup?.address,
            placeholder: "Jemput di mana?",
            onPress: () => openPicker("ride-pickup"),
          }}
          destination={{
            value: destination?.address,
            placeholder: "Mau ke mana?",
            onPress: () => openPicker("ride-destination"),
          }}
          onSwap={swapLocations}
          swapDisabled={!pickup || !destination}
        />
        <View className="relative mt-3 min-h-[104px] justify-start pr-24">
          <Text
            className="mt-2 font-semibold text-[19px] leading-6"
            style={{ color: heroColor }}
          >
            {promoTitle}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Text
              className="font-normal text-[15px] leading-5"
              style={{ color: heroColor }}
            >
              {promoSubtitle}
              {"\n"}
              {promoSubtitle2}
            </Text>
            <View className="h-[18px] w-[18px] items-center justify-center rounded-full bg-white">
              <FaChevronRightIcon size={10} color="#000000" />
            </View>
          </View>
          <View
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 88,
              height: 88,
              // Drop shadow follows the PNG's transparency, not the image box.
              filter: "drop-shadow(0 5px 12px rgba(0, 0, 0, 0.18))",
            }}
          >
            <Image
              source={SERVICE_ICONS[serviceType]}
              style={{ width: 88, height: 88 }}
              resizeMode="contain"
              accessibilityLabel={serviceLabel}
            />
          </View>
        </View>
      </View>
      <View
        className="gap-4 px-5"
        onLayout={(event) => {
          const { y, height } = event.nativeEvent.layout;
          setFormBottom(y + height);
        }}
      >
        {locationError ? (
          <Notice tone="danger">{locationError}</Notice>
        ) : null}
        <View className="gap-4">
          <Text className="font-extrabold text-[17px] text-foreground">
            Catatan untuk driver
          </Text>
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <FormField
                label="Catatan untuk driver (opsional)"
                placeholder="Contoh: tunggu di depan lobi"
                multiline
                numberOfLines={3}
                value={field.value}
                onChangeText={field.onChange}
                error={errors.notes?.message}
              />
            )}
          />
        </View>
        {mutation.isError ? (
          <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
        ) : null}
        <Text className="pt-2 text-center text-[13px] text-muted">
          Biaya perjalanan dihitung otomatis berdasarkan jarak.
        </Text>
        <Button
          title="Cari Driver"
          loading={mutation.isPending}
          onPress={submit}
          className="rounded-full"
        />
      </View>
    </Screen>
  );
}

function HeroHeader({
  title,
  onBack,
}: {
  title: string;
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
      <Text className="font-bold text-[22px] leading-7" style={{ color: "#FFFFFF" }}>
        {title}
      </Text>
    </View>
  );
}

function LocationCard({
  pickup,
  destination,
  onSwap,
  swapDisabled,
}: {
  pickup: { value?: string; placeholder: string; onPress: () => void };
  destination: { value?: string; placeholder: string; onPress: () => void };
  onSwap: () => void;
  swapDisabled: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="mt-4 rounded-2xl bg-surface px-4 py-5">
      <View className="flex-row">
        <View className="flex-1">
          <LocationRow
            marker={<FaDotCircleIcon size={16} color={PICKUP_BLUE} />}
            value={pickup.value}
            placeholder={pickup.placeholder}
            onPress={pickup.onPress}
          />
          <View className="my-1 w-6 items-center gap-[6px] self-start">
            <View className="h-[3px] w-[3px] rounded-full bg-[#C9CDD4]" />
            <View className="h-[3px] w-[3px] rounded-full bg-[#C9CDD4]" />
            <View className="h-[3px] w-[3px] rounded-full bg-[#C9CDD4]" />
          </View>
          <LocationRow
            marker={<HiLocationMarkerIcon size={22} color={DEST_RED} />}
            value={destination.value}
            placeholder={destination.placeholder}
            onPress={destination.onPress}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tukar lokasi"
          onPress={onSwap}
          disabled={swapDisabled}
          className="ml-2 h-10 w-10 self-center items-center justify-center rounded-full active:opacity-70"
          style={swapDisabled ? { opacity: 0.4 } : null}
        >
          <AppIcon name="swap" size={18} color={colors.text} />
        </Pressable>
      </View>
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
