import { AppIcon } from "@/components/app-icon";
import { FaDotCircleIcon, HiLocationMarkerIcon } from "@/components/brand-icons";
import { Button, FormField, Notice, Screen } from "@/components/ui";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import {
  createJastipOrder,
  type JastipItem,
} from "@/lib/api/titip-beli";
import { formatRupiah } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api/client";
import { useMutation } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/* ── types ───────────────────────────────────────────────── */

interface PurchaseLocationForm {
  placeName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isPaid: boolean;
  items: JastipItem[];
}

const UNIT_OPTIONS = [
  { label: "Kilo", value: "kilo" },
  { label: "Biji", value: "biji" },
  { label: "Pack", value: "pack" },
  { label: "Liter", value: "liter" },
  { label: "Box", value: "box" },
  { label: "Lusin", value: "lusin" },
  { label: "Roll", value: "roll" },
  { label: "Meter", value: "meter" },
];

const emptyItem = (): JastipItem => ({
  name: "",
  quantity: "1",
  unit: "",
  price: "",
  note: "",
});

const emptyLocation = (): PurchaseLocationForm => ({
  placeName: "",
  address: "",
  latitude: null,
  longitude: null,
  isPaid: false,
  items: [emptyItem()],
});

/* ── rupiah input helpers ───────────────────────────────── */

/** Strip non-digits and return raw number string. */
function parseRupiahInput(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

/** Format raw digits as "1.000.000" (no Rp prefix, used inside input). */
function formatRupiahInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

/* ── constants ───────────────────────────────────────────── */

const HERO_TEXT = "#1F1400";
const PICKUP_BLUE = "#2E9BF5";
const DEST_RED = "#FA2C19";

/* ── main screen ─────────────────────────────────────────── */

export default function CreateJastipScreen() {
  const router = useRouter();
  const { colors, mode } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [locations, setLocations] = useState<PurchaseLocationForm[]>([
    emptyLocation(),
  ]);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [driverNote, setDriverNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [collapsedLocations, setCollapsedLocations] = useState<Set<number>>(
    new Set(),
  );

  // Auto-calculate total from unpaid items across all locations
  const calculatedTotal = useMemo(() => {
    return locations.reduce((total, loc) => {
      if (loc.isPaid) return total;
      return total + loc.items.reduce((sum, item) => {
        return sum + (Number(item.price) || 0);
      }, 0);
    }, 0);
  }, [locations]);

  const totalItemCount = useMemo(() => {
    return locations.reduce((total, loc) => {
      return total + loc.items.filter((it) => it.name.trim()).length;
    }, 0);
  }, [locations]);

  const locationSubtotals = useMemo(() => {
    return locations.map((loc) => {
      if (loc.isPaid) return 0;
      return loc.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    });
  }, [locations]);

  const allPaid = useMemo(
    () => locations.length > 0 && locations.every((l) => l.isPaid),
    [locations],
  );

  const destination = useLocationPickerStore(
    (s) => s.selections["send-destination"],
  );

  useFocusEffect(
    useCallback(() => {
      if (useLocationPickerStore.getState().selections["send-destination"])
        return;
      let cancelled = false;
      void (async () => {
        const state = useLocationPickerStore.getState();
        const point =
          state.currentLocation ?? (await state.refreshCurrentLocation());
        if (cancelled || !point) return;
        useLocationPickerStore
          .getState()
          .setSelection("send-destination", point);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const mutation = useMutation({
    mutationFn: createJastipOrder,
    onSuccess: () => {
      router.replace("/(customer)/(tabs)");
    },
  });

  /* ── helpers ────────────────────────────────────────────── */

  const updateLocation = (
    index: number,
    patch: Partial<PurchaseLocationForm>,
  ) => {
    setLocations((prev) =>
      prev.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)),
    );
  };

  const removeLocation = (index: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== index));
    setCollapsedLocations((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const toggleCollapse = (index: number) => {
    setCollapsedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const togglePaid = (index: number) => {
    setLocations((prev) =>
      prev.map((loc, i) =>
        i === index ? { ...loc, isPaid: !loc.isPaid } : loc,
      ),
    );
  };

  const updateItem = (
    locIndex: number,
    itemIndex: number,
    patch: Partial<JastipItem>,
  ) => {
    setLocations((prev) =>
      prev.map((loc, i) => {
        if (i !== locIndex) return loc;
        return {
          ...loc,
          items: loc.items.map((item, j) =>
            j === itemIndex ? { ...item, ...patch } : item,
          ),
        };
      }),
    );
  };

  const addItem = (locIndex: number) => {
    setLocations((prev) =>
      prev.map((loc, i) =>
        i === locIndex ? { ...loc, items: [...loc.items, emptyItem()] } : loc,
      ),
    );
  };

  const removeItem = (locIndex: number, itemIndex: number) => {
    setLocations((prev) =>
      prev.map((loc, i) => {
        if (i !== locIndex) return loc;
        return {
          ...loc,
          items: loc.items.filter((_, j) => j !== itemIndex),
        };
      }),
    );
  };

  /* ── validation ─────────────────────────────────────────── */

  const validate = (): boolean => {
    const errs: string[] = [];

    if (locations.length < 1) {
      errs.push(t("jastip.minLocations"));
    }

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      if (!loc.placeName.trim()) {
        errs.push(`${t("jastip.placeName")} #${i + 1} ${t("common.required")}`);
      }
      if (loc.latitude === null || loc.longitude === null) {
        errs.push(`${t("jastip.purchaseLocation")} #${i + 1} ${t("common.required")}`);
      }
      const validItems = loc.items.filter((it) => it.name.trim());
      if (validItems.length === 0) {
        errs.push(`${t("jastip.shoppingList")} #${i + 1}: ${t("jastip.minItems")}`);
      }
    }

    if (!allPaid) {
      const total = Number(advanceAmount) || calculatedTotal;
      if (total < 0) {
        errs.push(t("jastip.advanceRequired"));
      }
    }

    if (!destination) {
      errs.push(t("jastip.destinationRequired"));
    }

    setErrors(errs);
    return errs.length === 0;
  };

  /* ── submit ─────────────────────────────────────────────── */

  const submit = () => {
    if (!validate() || !destination) return;

    const payload: Parameters<typeof createJastipOrder>[0] = {
      purchase_locations: locations.map((loc) => ({
        place_name: loc.placeName.trim(),
        address: loc.address,
        latitude: loc.latitude!,
        longitude: loc.longitude!,
        is_paid: loc.isPaid,
        items: loc.items
          .filter((it) => it.name.trim())
          .map((it) => ({
            name: it.name.trim(),
            quantity: it.quantity?.trim() || undefined,
            unit: it.unit?.trim() || undefined,
            price: loc.isPaid ? undefined : it.price?.trim() || undefined,
            note: it.note?.trim() || undefined,
          })),
      })),
      destination_address: destination.address,
      destination_latitude: destination.coordinate.latitude,
      destination_longitude: destination.coordinate.longitude,
      advance_amount: allPaid ? 0 : Number(advanceAmount) || calculatedTotal,
      driver_note: driverNote.trim() || undefined,
    };

    mutation.mutate(payload);
  };

  /* ── navigation helpers ────────────────────────────────── */

  const openDestinationPicker = () =>
    router.push({
      pathname: "/(customer)/location-search",
      params: {
        purpose: "send-destination",
        returnTo: "/(customer)/jastip/create",
      },
    });

  const openPickupPicker = (locIdx: number) =>
    router.push({
      pathname: "/(customer)/location-search",
      params: {
        purpose: "send-pickup",
        returnTo: "/(customer)/jastip/create",
      },
    });

  const handleBack = () => {
    const state = useLocationPickerStore.getState();
    const dest = state.selections["send-destination"];
    const current = state.currentLocation;
    const moved =
      !!dest &&
      (!current ||
        dest.coordinate.latitude !== current.coordinate.latitude ||
        dest.coordinate.longitude !== current.coordinate.longitude);
    if (moved) {
      state.clearSelection("send-destination");
      void state.refreshCurrentLocation();
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(customer)/(tabs)");
    }
  };

  /* ── sticky header ─────────────────────────────────────── */

  const [heroHeaderBottom, setHeroHeaderBottom] = useState(0);
  const [sticky, setSticky] = useState(false);

  /* ── render ─────────────────────────────────────────────── */

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
                {t("jastip.title")}
              </Text>
              {totalItemCount > 0 ? (
                <View className="ml-2 h-6 min-w-[26px] items-center justify-center rounded-full bg-brand px-2">
                  <Text className="text-xs font-bold text-on-brand">
                    {totalItemCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null
      }
    >
      {/* ── Hero ─────────────────────────────────────────── */}
      <View className="px-5 pb-10 pt-2">
        <Svg
          width="100%"
          height="100"
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

        <View
          onLayout={(event) =>
            setHeroHeaderBottom(
              event.nativeEvent.layout.y + event.nativeEvent.layout.height,
            )
          }
        >
          <View className="mt-2 flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kembali"
              onPress={handleBack}
              className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
            >
              <AppIcon
                name="back"
                size={26}
                color={mode === "dark" ? "#FFFFFF" : HERO_TEXT}
              />
            </Pressable>
            <Text
              className="font-bold text-[22px] leading-7"
              style={{ color: mode === "dark" ? "#FFFFFF" : HERO_TEXT }}
            >
              {t("jastip.title")}
            </Text>
          </View>
        </View>

        <View className="h-1" />
      </View>

      {/* ── Antar ke? (destination) ──────────────────────── */}
      <View className="px-5" style={{ marginTop: -46 }}>
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
          <Pressable
            accessibilityRole="button"
            onPress={openDestinationPicker}
            className="flex-row items-center active:opacity-70"
          >
            <View className="w-6 items-center justify-center">
              <HiLocationMarkerIcon size={22} color={DEST_RED} />
            </View>
            <Text
              numberOfLines={1}
              className={`ml-3 flex-1 text-[15px] leading-5 ${destination?.address ? "font-bold text-foreground" : "font-medium text-muted"}`}
            >
              {destination?.address || t("jastip.deliverTo")}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Beli di mana? ────────────────────────────────── */}
      <View className="px-5 pt-4">
        <Text className="font-extrabold text-[17px] text-foreground">
          {t("jastip.whereToBuy")}
        </Text>
      </View>

      {/* ── Location sections (flat, no card) ────────────── */}
      <View className="px-5">
        {locations.map((loc, locIdx) => {
          const isCollapsed = collapsedLocations.has(locIdx);
          const locSubtotal = locationSubtotals[locIdx] ?? 0;
          const validItemCount = loc.items.filter((it) => it.name.trim()).length;

          return (
            <View key={locIdx}>
              {/* Divider between locations */}
              {locIdx > 0 && (
                <View className="my-4 h-px bg-border" />
              )}

              {/* Collapse + remove (when >1 location) */}
              {locations.length > 1 && (
                <View className="mb-2 flex-row items-center justify-between">
                  <Pressable
                    onPress={() => toggleCollapse(locIdx)}
                    className="flex-row items-center gap-1"
                  >
                    <AppIcon
                      name={isCollapsed ? "forward" : "down"}
                      size={14}
                      color={colors.muted}
                    />
                    <Text className="text-xs font-semibold text-muted">
                      {isCollapsed ? "Tampilkan" : "Sembunyikan"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeLocation(locIdx)}
                    className="flex-row items-center gap-1"
                  >
                    <AppIcon name="close" size={16} color="#DC2626" />
                    <Text className="text-xs font-semibold text-danger">
                      {t("jastip.removeLocation")}
                    </Text>
                  </Pressable>
                </View>
              )}

              {!isCollapsed ? (
                <View className="gap-3">
                  {/* Location picker */}
                  <Pressable
                    onPress={() => openPickupPicker(locIdx)}
                    className="flex-row items-center rounded-xl bg-surface-muted px-4 py-3 active:opacity-70"
                  >
                    <View className="w-6 items-center justify-center">
                      <FaDotCircleIcon size={16} color={PICKUP_BLUE} />
                    </View>
                    <Text
                      numberOfLines={1}
                      className={`ml-3 flex-1 text-[15px] leading-5 ${loc.address ? "font-bold text-foreground" : "font-medium text-muted"}`}
                    >
                      {loc.address || "Ambil barang dari mana?"}
                    </Text>
                    <AppIcon name="forward" size={18} color={colors.muted} />
                  </Pressable>

                  {/* Place name */}
                  <FormField
                    label={t("jastip.placeName")}
                    value={loc.placeName}
                    onChangeText={(v) => updateLocation(locIdx, { placeName: v })}
                    placeholder={t("jastip.placeName")}
                  />

                  {/* Paid / Unpaid toggle */}
                  <Pressable
                    onPress={() => togglePaid(locIdx)}
                    className="flex-row items-center gap-3 rounded-xl border px-4 py-3 active:opacity-70"
                    style={{
                      borderColor: loc.isPaid ? "#16A34A" : colors.border,
                      backgroundColor: loc.isPaid ? "#F0FDF4" : colors.surfaceMuted,
                    }}
                  >
                    <View
                      className="h-6 w-11 items-center justify-center rounded-full"
                      style={{ backgroundColor: loc.isPaid ? "#16A34A" : colors.border }}
                    >
                      <View
                        className="h-5 w-5 rounded-full bg-white"
                        style={{ marginLeft: loc.isPaid ? 20 : 2 }}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] font-bold text-foreground">
                        {loc.isPaid ? t("jastip.paid") : t("jastip.unpaid")}
                      </Text>
                      <Text className="text-[11px] text-muted">
                        {t("jastip.paidHint")}
                      </Text>
                    </View>
                  </Pressable>

                  {/* ── Items ────────────────────────────── */}
                  {/* Subtotal header (only unpaid) */}
                  {!loc.isPaid && locSubtotal > 0 && (
                    <View className="flex-row items-center justify-between">
                      <Text className="font-semibold text-sm text-muted">
                        {t("jastip.shoppingList")}
                      </Text>
                      <Text className="font-bold text-sm text-foreground">
                        {formatRupiah(locSubtotal)}
                      </Text>
                    </View>
                  )}
                  {!loc.isPaid && locSubtotal === 0 && (
                    <Text className="font-semibold text-sm text-muted">
                      {t("jastip.shoppingList")}
                    </Text>
                  )}

                  {/* Item list (always shown, price hidden when paid) */}
                  {loc.items.map((item, itemIdx) => (
                    <View key={itemIdx}>
                      {itemIdx > 0 && (
                        <View className="my-2.5 h-px bg-border" />
                      )}

                      {/* Row 1: Nama · Qty +/- · Satuan · Hapus */}
                      <View className="flex-row items-center gap-2">
                        <TextInput
                          value={item.name}
                          onChangeText={(v) =>
                            updateItem(locIdx, itemIdx, { name: v })
                          }
                          placeholder={t("jastip.itemName")}
                          placeholderTextColor="#9CA3AF"
                          className="min-h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
                        />
                        <QuantityCounter
                          value={item.quantity}
                          onChange={(v) =>
                            updateItem(locIdx, itemIdx, { quantity: v })
                          }
                        />
                        <UnitDropdown
                          value={item.unit}
                          onChange={(v) =>
                            updateItem(locIdx, itemIdx, { unit: v })
                          }
                        />
                        {loc.items.length > 1 && (
                          <Pressable
                            onPress={() => removeItem(locIdx, itemIdx)}
                            className="h-7 w-7 items-center justify-center rounded-full active:opacity-70"
                          >
                            <AppIcon name="close" size={14} color="#9CA3AF" />
                          </Pressable>
                        )}
                      </View>

                      {/* Row 2: Perkiraan Harga (full width) */}
                      {!loc.isPaid && (
                        <TextInput
                          value={item.price ? formatRupiahInput(item.price) : ""}
                          onChangeText={(v) =>
                            updateItem(locIdx, itemIdx, { price: parseRupiahInput(v) })
                          }
                          placeholder="Perkiraan Harga"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          className="mt-1 min-h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
                        />
                      )}
                    </View>
                  ))}

                  <Pressable
                    onPress={() => addItem(locIdx)}
                    className="items-center rounded-xl border border-dashed border-border bg-background py-3 active:opacity-70"
                  >
                    <Text className="font-semibold text-sm text-brand">
                      {t("jastip.addItem")}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                /* Collapsed summary */
                <View className="flex-row items-center gap-2 rounded-xl bg-surface-muted px-3 py-2">
                  <AppIcon name="bag" size={14} color={colors.muted} />
                  <Text className="text-xs text-muted">
                    {validItemCount} barang
                    {loc.isPaid
                      ? ` · ${t("jastip.paid")}`
                      : locSubtotal > 0
                        ? ` · ${formatRupiah(locSubtotal)}`
                        : ""}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Add location button */}
        <Pressable
          onPress={() => setLocations((prev) => [...prev, emptyLocation()])}
          className="mt-4 items-center rounded-2xl border-2 border-dashed border-brand/40 bg-brand/5 py-3.5 active:opacity-70"
        >
          <Text className="font-bold text-sm text-brand">
            {t("jastip.addLocation")}
          </Text>
        </Pressable>
      </View>

      {/* ── Bottom section ───────────────────────────────── */}
      <View className="gap-4 px-5 pt-4">
        {/* Perkiraan Total Harga — only if unpaid locations */}
        {!allPaid ? (
          <View className="gap-3">
            <Text className="font-extrabold text-[17px] text-foreground">
              Perkiraan Total Harga
            </Text>
            <View className="rounded-[14px] border border-border bg-surface px-[15px]">
              <View className="min-h-12 flex-row items-center gap-1">
                <Text className="text-base text-muted">Rp</Text>
                <TextInput
                  value={
                    advanceAmount
                      ? formatRupiahInput(advanceAmount)
                      : calculatedTotal > 0
                        ? formatRupiahInput(String(calculatedTotal))
                        : ""
                  }
                  onChangeText={(v) => setAdvanceAmount(parseRupiahInput(v))}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  className="flex-1 text-base text-foreground"
                />
              </View>
            </View>
          </View>
        ) : (
          <View className="items-center rounded-2xl bg-success/10 px-4 py-3">
            <Text className="text-center text-sm font-bold text-success">
              Semua lokasi sudah dibayar ✓
            </Text>
            <Text className="text-center text-xs text-muted">
              Driver cukup ambil barang, tidak perlu bayar
            </Text>
          </View>
        )}

        {/* Catatan Driver */}
        <FormField
          label={t("jastip.driverNote")}
          value={driverNote}
          onChangeText={setDriverNote}
          placeholder={t("jastip.driverNote")}
          multiline
        />

        {/* Summary */}
        {totalItemCount > 0 ? (
          <View className="rounded-2xl border border-border bg-surface p-4">
            <Text className="font-extrabold text-[15px] text-foreground">
              Ringkasan
            </Text>
            <View className="mt-3 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-muted">
                  {totalItemCount} barang dari {locations.length} lokasi
                </Text>
                {!allPaid ? (
                  <Text className="font-bold text-[15px] text-foreground">
                    {formatRupiah(calculatedTotal)}
                  </Text>
                ) : (
                  <Text className="font-bold text-[15px] text-success">
                    Lunas ✓
                  </Text>
                )}
              </View>
              {Number(advanceAmount) > 0 &&
              Number(advanceAmount) !== calculatedTotal ? (
                <View className="flex-row items-center justify-between">                   <Text className="text-[13px] text-muted">Perkiraan Total</Text>
                  <Text className="font-bold text-[13px] text-foreground">
                    {formatRupiah(Number(advanceAmount))}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Errors */}
        {errors.length > 0 ? (
          <View className="gap-1">
            {errors.map((err, i) => (
              <Notice key={i} tone="danger">
                {err}
              </Notice>
            ))}
          </View>
        ) : null}

        {mutation.isError ? (
          <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
        ) : null}

        {/* Submit */}
        <Text className="text-center text-[13px] text-muted">
          {allPaid
            ? "Driver tinggal ambil barang di setiap lokasi."
            : "Biaya belanja & ongkir dihitung otomatis berdasarkan jarak."}
        </Text>
        <Button
          title={
            totalItemCount > 0 && !allPaid
              ? `Buat Pesanan · ${formatRupiah(calculatedTotal)}`
              : t("jastip.placeOrder")
          }
          loading={mutation.isPending}
          disabled={mutation.isPending}
          onPress={submit}
          className="mb-6 rounded-full"
        />
      </View>
    </Screen>
  );
}

/* ── Quantity Counter (+/- buttons) ────────────────────── */

function QuantityCounter({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  const num = Number(value) || 1;

  const decrement = () => {
    if (num > 1) onChange(String(num - 1));
  };
  const increment = () => onChange(String(num + 1));

  return (
    <View className="h-9 flex-row items-center gap-0">
      <Pressable
        onPress={decrement}
        disabled={num <= 1}
        className="h-7 w-7 items-center justify-center rounded-full bg-surface-muted"
        style={num <= 1 ? { opacity: 0.3 } : undefined}
      >
        <Text className="font-bold text-sm text-foreground">−</Text>
      </Pressable>
      <Text className="min-w-[18px] text-center text-sm font-semibold text-foreground">
        {num}
      </Text>
      <Pressable
        onPress={increment}
        className="h-7 w-7 items-center justify-center rounded-full bg-surface-muted"
      >
        <Text className="font-bold text-sm text-foreground">+</Text>
      </Pressable>
    </View>
  );
}

/* ── Unit Dropdown ───────────────────────────────────────── */

function UnitDropdown({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const selected = UNIT_OPTIONS.find((o) => o.value === value);
  const displayLabel = selected?.label || value || "Satuan";

  const handleSelect = (val: string) => {
    onChange(val === value ? "" : val);
    setOpen(false);
    setCustomMode(false);
    setCustomValue("");
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
    }
    setOpen(false);
    setCustomMode(false);
    setCustomValue("");
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-9 min-w-[72px] flex-row items-center justify-between rounded-lg border border-border bg-surface px-2.5"
      >
        <Text
          numberOfLines={1}
          className={`text-sm ${value ? "text-foreground" : "text-muted"}`}
        >
          {displayLabel}
        </Text>
        <AppIcon name="down" size={14} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => { setOpen(false); setCustomMode(false); }}>
          <View className="flex-1 items-center justify-center bg-black/40">
            <TouchableWithoutFeedback>
              <View
                className="w-72 max-h-80 rounded-2xl bg-surface p-2"
                style={{
                  shadowColor: "#111827",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <ScrollView showsVerticalScrollIndicator={false}>
                  {!customMode ? (
                    <>
                      {UNIT_OPTIONS.map((opt) => (
                        <Pressable
                          key={opt.value}
                          onPress={() => handleSelect(opt.value)}
                          className={`rounded-xl px-4 py-3 ${opt.value === value ? "bg-brand/10" : ""}`}
                        >
                          <Text
                            className={`text-sm ${opt.value === value ? "font-bold text-brand" : "text-foreground"}`}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                      {/* Custom input option */}
                      <View className="my-1 h-px bg-border" />
                      <Pressable
                        onPress={() => setCustomMode(true)}
                        className="rounded-xl px-4 py-3"
                      >
                        <Text className="text-sm font-semibold text-brand">
                          Ketik manual…
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <View className="gap-3 p-3">
                      <Text className="text-xs font-semibold text-muted">
                        Satuan custom
                      </Text>
                      <TextInput
                        autoFocus
                        value={customValue}
                        onChangeText={setCustomValue}
                        placeholder="Contoh: Lembar"
                        placeholderTextColor="#9CA3AF"
                        onSubmitEditing={handleCustomSubmit}
                        className="min-h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                      />
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => setCustomMode(false)}
                          className="flex-1 items-center justify-center rounded-xl border border-border py-2.5"
                        >
                          <Text className="text-sm font-semibold text-muted">
                            Kembali
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleCustomSubmit}
                          className="flex-1 items-center justify-center rounded-xl bg-brand py-2.5"
                        >
                          <Text className="text-sm font-bold text-on-brand">
                            Pilih
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
