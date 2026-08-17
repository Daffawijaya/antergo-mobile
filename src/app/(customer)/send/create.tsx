import { AppIcon, type AppIconName } from "@/components/app-icon";
import {
  FaDotCircleIcon,
  HiLocationMarkerIcon,
} from "@/components/brand-icons";
import { Button, FormField, Notice, Screen } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { listCustomerOrders } from "@/lib/api/rides";
import { createSend } from "@/lib/api/send";
import {
  coordinateFromLocation,
  getLastKnownCoordinate,
  parseCoordinate,
  requestCurrentLocation,
  reverseGeocodeLabel,
} from "@/lib/location";
import { orderKeys } from "@/lib/query-keys";
import { createSendSchema, type CreateSendForm } from "@/schemas/send";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import { useAppTheme } from "@/stores/theme-store";
import type { ApiErrorPayload, Order } from "@/types/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

const defaults: CreateSendForm = {
  pickup_address: "",
  pickup_latitude: "",
  pickup_longitude: "",
  destination_address: "",
  destination_latitude: "",
  destination_longitude: "",
  item_name: "",
  item_description: "",
  recipient_name: "",
  recipient_phone: "",
  notes: "",
};

// GrabExpress-style palette used on this screen (reference design).
const PICKUP_BLUE = "#2E9BF5";
const DEST_RED = "#FA2C19";
const HERO_TEXT = "#1F1400";

export default function CreateSendScreen() {
  const router = useRouter();
  const [vehicleType, setVehicleType] = useState<"motorcycle" | "car">(
    "motorcycle",
  );
  const client = useQueryClient();
  const pickup = useLocationPickerStore((s) => s.selections["send-pickup"]);
  const destination = useLocationPickerStore(
    (s) => s.selections["send-destination"],
  );
  // Pre-fill the pickup with the user's current location whenever the screen
  // gains focus — on first open and on every re-entry after going back. This
  // screen is a tab, so it stays mounted across visits and a mount-only effect
  // never re-runs (which is why the pickup went missing on re-entry). Skip it
  // when a pickup has already been chosen.
  useFocusEffect(
    useCallback(() => {
      if (useLocationPickerStore.getState().selections["send-pickup"]) return;
      let cancelled = false;
      void (async () => {
        try {
          const known = await getLastKnownCoordinate();
          const point =
            known ?? coordinateFromLocation(await requestCurrentLocation());
          const address = await reverseGeocodeLabel(point);
          if (cancelled) return;
          useLocationPickerStore
            .getState()
            .setSelection("send-pickup", { coordinate: point, address });
        } catch {
          // GPS tidak tersedia/ditolak — biarkan lokasi jemput tetap kosong.
        }
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
  } = useForm<CreateSendForm>({
    resolver: zodResolver(createSendSchema),
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
  const history = useQuery({
    queryKey: [...orderKeys.all, "create-send"],
    queryFn: () => listCustomerOrders(1),
  });
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const result: Order[] = [];
    for (const order of history.data?.data ?? []) {
      if (order.type !== "send" || !order.destination_address) continue;
      if (
        !parseCoordinate(
          order.destination_latitude,
          order.destination_longitude,
        )
      )
        continue;
      const key = order.destination_address.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(order);
      if (result.length >= 5) break;
    }
    return result;
  }, [history.data]);
  const mutation = useMutation({
    mutationFn: createSend,
    onSuccess: async ({ order }) => {
      await client.invalidateQueries({ queryKey: orderKeys.all });
      router.replace({
        pathname: "/(customer)/send/[id]",
        params: { id: String(order.id) },
      });
    },
  });
  const submit = handleSubmit((value) =>
    mutation.mutate(
      {
        pickup_address: value.pickup_address.trim(),
        pickup_latitude: Number(value.pickup_latitude),
        pickup_longitude: Number(value.pickup_longitude),
        destination_address: value.destination_address.trim(),
        destination_latitude: Number(value.destination_latitude),
        destination_longitude: Number(value.destination_longitude),
        item_name: value.item_name.trim(),
        item_description: value.item_description?.trim() || null,
        recipient_name: value.recipient_name.trim(),
        recipient_phone: value.recipient_phone.trim(),
        notes: value.notes?.trim() || null,
        payment_method: "cash",
        vehicle_type: vehicleType,
      },
      {
        onError: (error) => {
          if (!isAxiosError<ApiErrorPayload>(error)) return;
          Object.entries(error.response?.data?.errors ?? {}).forEach(
            ([field, messages]) => {
              if (field in defaults)
                setError(field as keyof CreateSendForm, {
                  type: "server",
                  message: messages[0],
                });
            },
          );
        },
      },
    ),
  );
  const openPicker = (purpose: "send-pickup" | "send-destination") =>
    router.push({
      pathname: "/(customer)/location-search" as never,
      params: { purpose, returnTo: "/(customer)/send/create" },
    });
  const swapLocations = () => {
    const state = useLocationPickerStore.getState();
    const currentPickup = state.selections["send-pickup"];
    const currentDestination = state.selections["send-destination"];
    if (!currentPickup || !currentDestination) return;
    state.setSelection("send-pickup", currentDestination);
    state.setSelection("send-destination", currentPickup);
  };
  const applySuggestion = (order: Order) => {
    const coordinate = parseCoordinate(
      order.destination_latitude,
      order.destination_longitude,
    );
    if (!coordinate || !order.destination_address) return;
    useLocationPickerStore.getState().setSelection("send-destination", {
      coordinate,
      address: order.destination_address,
    });
  };
  const { mode } = useAppTheme();
  const locationError =
    errors.pickup_address?.message ||
    errors.pickup_latitude?.message ||
    errors.destination_address?.message ||
    errors.destination_latitude?.message;

  return (
    <Screen padded={false} className="gap-0 bg-background">
        <View className="px-5 pb-14 pt-2">
          <Svg
            width="100%"
            height="188"
            style={{ position: "absolute", top: 0, left: 0, right: 0 }}
          >
            <Defs>
              <LinearGradient
                id="delivery-hero"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <Stop
                  offset="0%"
                  stopColor={mode === "dark" ? "#423500" : "#FFF9E6"}
                />
                <Stop
                  offset="100%"
                  stopColor={mode === "dark" ? "#2B2410" : "#FFE7A0"}
                />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#delivery-hero)" />
          </Svg>
          <HeroHeader
            mode={mode}
            onBack={() => {
              // Don't carry the chosen locations or form data over: leaving via
              // back starts the next order from a clean state.
              useLocationPickerStore.getState().clearSelection("send-pickup");
              useLocationPickerStore
                .getState()
                .clearSelection("send-destination");
              reset();
              router.back();
            }}
          />
          <View className="relative mt-3 min-h-[104px] justify-start pr-24">
            <Text
              className="font-semibold text-[16px] leading-5"
              style={{ color: mode === "dark" ? "#FFFFFF" : HERO_TEXT }}
            >
              Kirim barang praktis & murah
            </Text>
            <View className="mt-1 flex-row items-center gap-0.5">
              <Text
                className="font-normal text-[15px] leading-5"
                style={{ color: mode === "dark" ? "#FFFFFF" : HERO_TEXT }}
              >
                Driver siap antar
              </Text>
              <AppIcon
                name="forward"
                size={16}
                color={mode === "dark" ? "#FFFFFF" : HERO_TEXT}
              />
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
                source={require("../../../../assets/images/icon/delivery.png")}
                style={{ width: 88, height: 88 }}
                resizeMode="contain"
                accessibilityLabel="Delivery"
              />
            </View>
          </View>
        </View>
        <View className="-mt-22 px-5">
          <LocationCard
            pickup={{
              value: pickup?.address,
              placeholder: "Ambil barang dari mana?",
              onPress: () => openPicker("send-pickup"),
            }}
            destination={{
              value: destination?.address,
              placeholder: "Antar ke?",
              onPress: () => openPicker("send-destination"),
            }}
            onSwap={swapLocations}
            swapDisabled={!pickup || !destination}
          />
        </View>
        <View className="gap-4 px-5 pt-4">
          {suggestions.length ? (
            <SuggestionRow items={suggestions} onSelect={applySuggestion} />
          ) : null}
          <VehicleSelector value={vehicleType} onChange={setVehicleType} />
          {locationError ? (
            <Notice tone="danger">{locationError}</Notice>
          ) : null}
          <View className="gap-4 px-2 pt-4">
            <Text className="font-extrabold text-[17px] text-foreground">
              Detail pengiriman
            </Text>
            <View className="gap-3">
              <Text className="font-medium text-[13px] uppercase tracking-widest text-muted">
                Barang
              </Text>
              <Controller
                control={control}
                name="item_name"
                render={({ field }) => (
                  <FormField
                    label="Nama barang"
                    placeholder="Contoh: Dokumen"
                    returnKeyType="next"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.item_name?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="item_description"
                render={({ field }) => (
                  <FormField
                    label="Detail barang (opsional)"
                    placeholder="Ukuran, warna, atau ciri barang"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.item_description?.message}
                  />
                )}
              />
              <Text className="mt-6 font-medium text-[13px] uppercase tracking-widest text-muted">
                Penerima
              </Text>
              <Controller
                control={control}
                name="recipient_name"
                render={({ field }) => (
                  <FormField
                    label="Nama penerima"
                    placeholder="Contoh: Daffa"
                    returnKeyType="next"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.recipient_name?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="recipient_phone"
                render={({ field }) => (
                  <FormField
                    label="Nomor HP penerima"
                    placeholder="Contoh: 0812xxxx"
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.recipient_phone?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <FormField
                    label="Catatan untuk driver (opsional)"
                    placeholder="Contoh: Titip di satpam"
                    multiline
                    numberOfLines={3}
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.notes?.message}
                  />
                )}
              />
            </View>
          </View>
          {mutation.isError ? (
            <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
          ) : null}
          <Text className="pt-2 text-center text-[13px] text-muted">
            Biaya pengiriman dihitung otomatis berdasarkan jarak.
          </Text>
          <Button
            title="Cari Driver"
            loading={mutation.isPending}
            onPress={submit}
            className="rounded-full"
          />
          <View style={{ position: "absolute", opacity: 0 }}>
            <Text className="text-white" />
          </View>
        </View>
    </Screen>
  );
}

function HeroHeader({
  onBack,
  mode,
}: {
  onBack: () => void;
  mode: "light" | "dark";
}) {
  const color = mode === "dark" ? "#FFFFFF" : HERO_TEXT;
  return (
    <View className="mt-2 flex-row items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kembali"
        onPress={onBack}
        className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
      >
        <AppIcon name="back" size={26} color={color} />
      </Pressable>
      <Text className="font-bold text-[22px] leading-7" style={{ color }}>
        Delivery
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
    <View
      className="rounded-2xl bg-surface px-4 py-5"
      style={{
        shadowColor: "#111827",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
        elevation: 6,
      }}
    >
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

function SuggestionRow({
  items,
  onSelect,
}: {
  items: Order[];
  onSelect: (order: Order) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2.5"
    >
      {items.map((order) => (
        <Pressable
          key={order.id}
          onPress={() => onSelect(order)}
          className="min-w-[150px] max-w-[220px] rounded-2xl border border-border bg-surface px-3.5 py-3 active:opacity-75"
        >
          <Text className="text-[11px] font-medium leading-4 text-muted">
            Kirim ke
          </Text>
          <View className="mt-1 flex-row items-center gap-1.5">
            <AppIcon name="pin" size={13} color={DEST_RED} />
            <Text
              numberOfLines={1}
              className="shrink font-bold text-[14px] leading-5 text-foreground"
            >
              {order.destination_address}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const VEHICLES: {
  type: "motorcycle" | "car";
  label: string;
  sub: string;
  icon: AppIconName;
}[] = [
  { type: "motorcycle", label: "Motor", sub: "Cepat & hemat", icon: "bike" },
  { type: "car", label: "Mobil", sub: "Barang besar & banyak", icon: "car" },
];

function VehicleSelector({
  value,
  onChange,
}: {
  value: "motorcycle" | "car";
  onChange: (type: "motorcycle" | "car") => void;
}) {
  return (
    <View className="gap-3">
      <Text className="font-extrabold text-[17px] text-foreground">
        Pilih kendaraan
      </Text>
      <View className="flex-row gap-3">
        {VEHICLES.map((vehicle) => (
          <VehicleCard
            key={vehicle.type}
            label={vehicle.label}
            sub={vehicle.sub}
            icon={vehicle.icon}
            selected={value === vehicle.type}
            onPress={() => onChange(vehicle.type)}
          />
        ))}
      </View>
    </View>
  );
}

function VehicleCard({
  label,
  sub,
  icon,
  selected,
  onPress,
}: {
  label: string;
  sub: string;
  icon: AppIconName;
  selected: boolean;
  onPress: () => void;
}) {
  const { mode } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-1 rounded-[18px] border px-4 pb-3.5 pt-4 active:opacity-80 ${selected ? "border-[#FFB900]" : "border-border bg-surface"}`}
      style={
        selected
          ? { backgroundColor: mode === "dark" ? "#2B2410" : "#FFF9E6" }
          : null
      }
    >
      <View className="flex-row items-start justify-between">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-surface elevation-sm">
          <AppIcon
            name={icon}
            size={24}
            color={selected ? "#92400E" : "#9CA3AF"}
          />
        </View>
        {selected ? (
          <View className="h-5 w-5 items-center justify-center rounded-full bg-[#FFB900]">
            <AppIcon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : null}
      </View>
      <Text className="mt-2.5 font-extrabold text-[15px] leading-5 text-foreground">
        {label}
      </Text>
      <Text className="mt-0.5 text-[12px] leading-4 text-muted">{sub}</Text>
    </Pressable>
  );
}
