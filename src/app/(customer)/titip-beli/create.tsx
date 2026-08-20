import { useState } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Button, FormField, Notice, Screen } from "@/components/ui";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import {
  createTitipBeliOrder,
  type TitipBeliItem,
  type TitipBeliLocation,
} from "@/lib/api/titip-beli";
import { getApiErrorMessage } from "@/lib/api/client";
import { useMutation } from "@tanstack/react-query";
import { HiLocationMarkerIcon } from "@/components/brand-icons";

interface PurchaseLocationForm {
  placeName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  items: TitipBeliItem[];
}

const emptyItem = (): TitipBeliItem => ({ name: "", quantity: "", note: "" });

const emptyLocation = (): PurchaseLocationForm => ({
  placeName: "",
  address: "",
  latitude: null,
  longitude: null,
  items: [emptyItem()],
});

export default function CreateTitipBeliScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const [locations, setLocations] = useState<PurchaseLocationForm[]>([
    emptyLocation(),
  ]);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [driverNote, setDriverNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  // Destination defaults to current location
  const destination = useLocationPickerStore(
    (s) => s.selections["send-destination"],
  );

  const mutation = useMutation({
    mutationFn: createTitipBeliOrder,
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
  };

  const updateItem = (
    locIndex: number,
    itemIndex: number,
    patch: Partial<TitipBeliItem>,
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
      errs.push(t("titipBeli.minLocations"));
    }

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      if (!loc.placeName.trim()) {
        errs.push(`${t("titipBeli.placeName")} #${i + 1} ${t("common.required")}`);
      }
      if (loc.latitude === null || loc.longitude === null) {
        errs.push(`${t("titipBeli.purchaseLocation")} #${i + 1} ${t("common.required")}`);
      }
      const validItems = loc.items.filter((it) => it.name.trim());
      if (validItems.length === 0) {
        errs.push(`${t("titipBeli.shoppingList")} #${i + 1}: ${t("titipBeli.minItems")}`);
      }
    }

    if (!advanceAmount || Number(advanceAmount) < 0) {
      errs.push(t("titipBeli.advanceRequired"));
    }

    if (!destination) {
      errs.push(t("titipBeli.destinationRequired"));
    }

    setErrors(errs);
    return errs.length === 0;
  };

  /* ── submit ─────────────────────────────────────────────── */

  const submit = () => {
    if (!validate() || !destination) return;

    const payload: Parameters<typeof createTitipBeliOrder>[0] = {
      purchase_locations: locations.map((loc, idx) => ({
        place_name: loc.placeName.trim(),
        address: loc.address,
        latitude: loc.latitude!,
        longitude: loc.longitude!,
        sequence: idx + 1,
        items: loc.items
          .filter((it) => it.name.trim())
          .map((it) => ({
            name: it.name.trim(),
            quantity: it.quantity?.trim() || undefined,
            note: it.note?.trim() || undefined,
          })),
      })),
      destination_address: destination.address,
      destination_latitude: destination.coordinate.latitude,
      destination_longitude: destination.coordinate.longitude,
      advance_amount: Number(advanceAmount) || 0,
      driver_note: driverNote.trim() || undefined,
    };

    mutation.mutate(payload);
  };

  /* ── render ─────────────────────────────────────────────── */

  return (
    <Screen padded={false} className="gap-4 px-4 pt-2">
      {/* Header */}
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => router.back()}
          className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
        >
          <AppIcon name="back" size={26} color={colors.text} />
        </Pressable>
        <Text className="font-bold text-xl text-foreground">
          {t("titipBeli.title")}
        </Text>
      </View>

      {/* ── Beli di mana? ─────────────────────── */}
      <Text className="font-bold text-lg text-foreground">
        {t("titipBeli.whereToBuy")}
      </Text>

      {locations.map((loc, locIdx) => (
        <View key={locIdx} className="gap-3 rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-base text-foreground">
              {t("titipBeli.purchaseLocation")} {locIdx + 1}
            </Text>
            {locations.length > 1 ? (
              <Pressable
                onPress={() => removeLocation(locIdx)}
                className="flex-row items-center gap-1"
              >
                <AppIcon name="close" size={16} color="#DC2626" />
                <Text className="text-xs font-semibold text-danger">
                  {t("titipBeli.removeLocation")}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Location picker */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(customer)/location-search",
                params: {
                  purpose: "send-pickup",
                  returnTo: "/(customer)/titip-beli/create",
                },
              })
            }
            className="flex-row items-center gap-3 rounded-xl bg-surface-muted px-4 py-3"
          >
            <HiLocationMarkerIcon size={20} color={colors.muted} />
            <Text
              numberOfLines={1}
              className={`flex-1 text-sm ${loc.address ? "text-foreground" : "text-muted"}`}
            >
              {loc.address || t("location.sendPickup")}
            </Text>
          </Pressable>

          {/* Place name */}
          <FormField
            label={t("titipBeli.placeName")}
            value={loc.placeName}
            onChangeText={(v) => updateLocation(locIdx, { placeName: v })}
            placeholder={t("titipBeli.placeName")}
          />

          {/* Items */}
          <Text className="font-semibold text-sm text-muted">
            {t("titipBeli.shoppingList")}
          </Text>
          {loc.items.map((item, itemIdx) => (
            <View key={itemIdx} className="gap-2">
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <TextInput
                    value={item.name}
                    onChangeText={(v) =>
                      updateItem(locIdx, itemIdx, { name: v })
                    }
                    placeholder={t("titipBeli.itemName")}
                    placeholderTextColor="#9CA3AF"
                    className="min-h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                  />
                </View>
                <View className="w-20">
                  <TextInput
                    value={item.quantity}
                    onChangeText={(v) =>
                      updateItem(locIdx, itemIdx, { quantity: v })
                    }
                    placeholder={t("titipBeli.quantity")}
                    placeholderTextColor="#9CA3AF"
                    className="min-h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                  />
                </View>
                {loc.items.length > 1 ? (
                  <Pressable
                    onPress={() => removeItem(locIdx, itemIdx)}
                    className="h-10 w-10 items-center justify-center"
                  >
                    <AppIcon name="close" size={16} color="#DC2626" />
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                value={item.note}
                onChangeText={(v) =>
                  updateItem(locIdx, itemIdx, { note: v })
                }
                placeholder={t("titipBeli.note")}
                placeholderTextColor="#9CA3AF"
                className="min-h-9 rounded-xl border border-border bg-surface px-3 text-xs text-muted"
              />
            </View>
          ))}

          <Pressable
            onPress={() => addItem(locIdx)}
            className="items-center rounded-xl border border-dashed border-border py-2.5 active:opacity-70"
          >
            <Text className="font-semibold text-sm text-brand">
              {t("titipBeli.addItem")}
            </Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={() => setLocations((prev) => [...prev, emptyLocation()])}
        className="items-center rounded-2xl border-2 border-dashed border-brand/40 bg-brand/5 py-3.5 active:opacity-70"
      >
        <Text className="font-bold text-sm text-brand">
          {t("titipBeli.addLocation")}
        </Text>
      </Pressable>

      {/* ── Talangan ──────────────────────────── */}
      <FormField
        label={t("titipBeli.advancePayment")}
        value={advanceAmount}
        onChangeText={setAdvanceAmount}
        keyboardType="numeric"
        placeholder="Rp 0"
      />

      {/* ── Catatan Driver ────────────────────── */}
      <FormField
        label={t("titipBeli.driverNote")}
        value={driverNote}
        onChangeText={setDriverNote}
        placeholder={t("titipBeli.driverNote")}
        multiline
      />

      {/* ── Antar ke ──────────────────────────── */}
      <Text className="font-bold text-lg text-foreground">
        {t("titipBeli.deliverTo")}
      </Text>
      <View className="flex-row items-center gap-3 rounded-xl bg-surface-muted px-4 py-3">
        <HiLocationMarkerIcon size={20} color="#DC2626" />
        <Text
          numberOfLines={2}
          className={`flex-1 text-sm ${destination ? "text-foreground" : "text-muted"}`}
        >
          {destination?.address || t("location.topSendDest")}
        </Text>
      </View>

      {/* ── Errors ────────────────────────────── */}
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

      {/* ── Submit ─────────────────────────────── */}
      <Button
        title={t("titipBeli.placeOrder")}
        loading={mutation.isPending}
        disabled={mutation.isPending}
        onPress={submit}
        className="mb-6"
      />
    </Screen>
  );
}
