import { AppIcon } from "@/components/app-icon";
import { HiLocationMarkerIcon } from "@/components/brand-icons";
import { MapPreview } from "@/components/map-preview";
import { PhotoInput } from "@/components/photo-input";
import { Button, FormField, Notice, Screen } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { registerMerchant } from "@/lib/api/resources";
import type { OptimizedPhoto } from "@/lib/image-upload";
import { useAuthStore } from "@/stores/auth-store";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MerchantRegisterScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refreshUser);
  const setRole = useAuthStore((s) => s.setActiveRole);
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<OptimizedPhoto>();

  // Hasil pilihan dari map picker (purpose "merchant-location").
  const picked = useLocationPickerStore(
    (s) => s.selections["merchant-location"],
  );
  const coordinate = picked?.coordinate;

  const goBack = () =>
    returnTo ? router.replace(returnTo as never) : router.back();
  const mutation = useMutation({
    mutationFn: registerMerchant,
    onSuccess: async () => {
      const u = await refresh();
      if (u?.roles.includes("merchant")) await setRole("merchant");
    },
  });
  // Langsung ke map picker, mulai dari lokasi terkini (sudah di-fetch di awal;
  // baru ambil fix fresh kalau belum ada).
  const openMapPicker = async () => {
    const state = useLocationPickerStore.getState();
    const point =
      state.selections["merchant-location"]?.coordinate ??
      state.currentLocation?.coordinate ??
      (await state.refreshCurrentLocation())?.coordinate;
    router.push({
      pathname: "/(customer)/location-picker",
      params: {
        purpose: "merchant-location",
        returnTo: "/(customer)/(tabs)/merchant-register",
        ...(point
          ? {
              latitude: String(point.latitude),
              longitude: String(point.longitude),
            }
          : {}),
      },
    });
  };
  const invalid =
    !name.trim() ||
    !phone.trim() ||
    !address.trim() ||
    !coordinate ||
    !image;

  const headerRow = (textColor: string) => (
    <View className="flex-row items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        onPress={goBack}
        className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
      >
        <AppIcon name="back" size={26} color={textColor} />
      </Pressable>
      <Text className="font-bold text-[22px] leading-7" style={{ color: textColor }}>
        {t("merchantRegister.title")}
      </Text>
    </View>
  );

  return (
    <Screen
      padded={false}
      className="gap-0 bg-background"
      header={
        <View
          className="px-5 pb-5"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
          }}
        >
          {headerRow(colors.text)}
        </View>
      }
    >
      {/* ── Form (polos, tanpa card) — diberi jarak dari header fixed ── */}
      <View className="gap-4 px-5" style={{ paddingTop: insets.top + 68 }}>
        <PhotoInput
            label={t("merchantRegister.businessPhoto")}
            helper={t("merchantRegister.businessPhotoHint")}
            kind="merchant"
            value={image}
            onChange={setImage}
            variant="avatar"
          />
          <FormField label={t("merchantRegister.businessName")} value={name} onChangeText={setName} />
          <FormField
            label={t("merchantRegister.description")}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <FormField
            label={t("merchantRegister.phoneNumber")}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <FormField
            label={t("merchantRegister.address")}
            value={address}
            onChangeText={setAddress}
            multiline
          />
          <FormField
            label={t("merchantRegister.notes")}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("merchantRegister.notesPlaceholder")}
            maxLength={500}
            multiline
          />
          <View className="gap-2 border-t border-border pt-4">
            <Text className="font-medium text-base text-foreground">
              {t("merchantRegister.storeLocation")}
            </Text>
            {/* Preview peta — jelas terlihat bisa diklik (stroke brand saat
                sudah dipilih), tap → picker peta penuh. */}
            <Pressable
              onPress={openMapPicker}
              accessibilityRole="button"
              accessibilityLabel={t("location.pickOnMap")}
              className={`h-40 w-full items-center justify-center overflow-hidden rounded-xl border-2 active:opacity-80 ${
                coordinate
                  ? "border-brand"
                  : "border-dashed border-border bg-surface-muted"
              }`}
            >
              {coordinate ? (
                <MapPreview coordinate={coordinate} />
              ) : (
                <View className="items-center gap-1.5">
                  <HiLocationMarkerIcon size={26} color={colors.muted} />
                  <Text className="text-sm text-muted">
                    {t("location.pickOnMap")}
                  </Text>
                </View>
              )}
            </Pressable>
            {picked ? (
              <Text numberOfLines={2} className="text-sm text-muted">
                {picked.address}
              </Text>
            ) : null}
            <Button
              variant="secondary"
              title={t("location.pickOnMap")}
              onPress={() => void openMapPicker()}
            />
          </View>
          {mutation.isError ? (
            <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
          ) : null}
      </View>
      <View className="px-5 pb-8 pt-4">
        <Button
          title={t("merchantRegister.registerMerchant")}
          disabled={invalid}
          loading={mutation.isPending}
          onPress={() =>
            mutation.mutate({
              name: name.trim(),
              description: description.trim() || undefined,
              phone: phone.trim(),
              address: address.trim(),
              notes: notes.trim() || undefined,
              latitude: coordinate!.latitude,
              longitude: coordinate!.longitude,
              image: image!,
            })
          }
        />
        {invalid ? (
          <Text className="pt-3 text-center text-sm text-muted">
            {t("merchantRegister.requiredFields")}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
