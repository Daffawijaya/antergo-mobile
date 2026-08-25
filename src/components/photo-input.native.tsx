import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, Modal, Pressable, Text, View } from "react-native";

import { ActionSheet } from "./action-sheet";
import { HiMiniCameraIcon } from "./brand-icons";
import { Button } from "@/components/ui";
import {
  optimizePhoto,
  type OptimizedPhoto,
  type PhotoKind,
} from "@/lib/image-upload";
import { useAppTheme } from "@/stores/theme-store";

type PhotoInputProps = {
  label: string;
  helper: string;
  kind: PhotoKind;
  value?: OptimizedPhoto;
  onChange: (value?: OptimizedPhoto) => void;
  document?: boolean;
  /** "card" = kotak besar (dokumen); "avatar" = lingkaran profil minimalis. */
  variant?: "card" | "avatar";
};

export function PhotoInput({
  label,
  helper,
  kind,
  value,
  onChange,
  document = false,
  variant = "card",
}: PhotoInputProps) {
  const [busy, setBusy] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetActive, setSheetActive] = useState(false);
  const { colors } = useAppTheme();

  const launch = async (source: "camera" | "gallery") => {
    try {
      setBusy(true);

      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Izin kamera diperlukan",
            "Aktifkan izin kamera untuk mengambil foto.",
          );

          return;
        }
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Izin galeri diperlukan",
            "Aktifkan izin galeri untuk memilih foto.",
          );

          return;
        }
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              cameraType: ImagePicker.CameraType.back,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 1,
            });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const photo = await optimizePhoto(result.assets[0], kind);

      onChange(photo);
    } catch (error) {
      Alert.alert(
        "Foto gagal diproses",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = () => {
    if (busy) {
      return;
    }

    onChange(undefined);
  };

  // Close beranimasi: sheet dulu slide-down + fade (200ms), baru Modal di-unmount.
  const openSheet = () => {
    setSheetVisible(true);
    setSheetActive(true);
  };
  const closeSheet = () => {
    setSheetActive(false);
    // ponytail: 220ms hardcoded mengikuti durasi exit animation ActionSheet.
    setTimeout(() => setSheetVisible(false), 220);
  };

  // Varian avatar: lingkaran profil minimalis, tap → sheet kamera/galeri/hapus.
  if (variant === "avatar") {
    return (
      <View className="items-center gap-2">
        {/* ActionSheet pakai absolute inset-0 — dibungkus Modal agar overlay
            menutupi seluruh layar, bukan hanya card tempat dia ter-pasang. */}
        <Modal
          transparent
          visible={sheetVisible}
          animationType="none"
          onRequestClose={closeSheet}
        >
          <ActionSheet
            visible={sheetActive}
            onClose={closeSheet}
            photoMode={{
              kind,
              onPicked: (photo) => onChange(photo),
              remove: value
                ? { label: `Hapus ${label}`, onRemove: () => onChange(undefined) }
                : undefined,
            }}
          />
        </Modal>
        <Pressable
          onPress={openSheet}
          accessibilityRole="button"
          accessibilityLabel={label}
          className="relative active:opacity-70"
        >
          <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-dashed border-border bg-surface-muted">
            {value ? (
              <Image
                source={{ uri: value.uri }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <HiMiniCameraIcon size={28} color={colors.muted} />
            )}
          </View>
          {value ? (
            <View className="absolute bottom-0.5 right-0.5 rounded-full bg-surface p-1.5 shadow-sm">
              <HiMiniCameraIcon size={13} color={colors.text} />
            </View>
          ) : null}
        </Pressable>
        <Text className="text-base font-medium text-foreground">
          {label} <Text className="text-red-500">*</Text>
        </Text>
        <Text className="text-center text-sm leading-5 text-muted">
          {helper}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2 border-b border-border pb-5">
      <Text className="text-base font-medium text-foreground">
        {label} <Text className="text-red-500">*</Text>
      </Text>

      <Text className="text-sm leading-5 text-muted">{helper}</Text>

      <View
        className={`relative overflow-hidden rounded-xl border border-border bg-surface-muted ${
          document ? "aspect-[1.58]" : "aspect-[4/3]"
        }`}
      >
        {value ? (
          <>
            <Image
              source={{ uri: value.uri }}
              className="h-full w-full"
              resizeMode="cover"
            />

            <Pressable
              onPress={removePhoto}
              disabled={busy}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Hapus ${label}`}
              className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/70"
            >
              <Text className="text-xl font-semibold leading-5 text-white">
                ×
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => void launch("camera")}
            disabled={busy}
            className="flex-1 items-center justify-center px-6"
          >
            <Text className="text-center font-medium text-muted">
              {busy ? "Memproses foto..." : "Ketuk untuk mengambil foto"}
            </Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            compact
            title={busy ? "Memproses…" : "Ambil Foto"}
            disabled={busy}
            onPress={() => void launch("camera")}
          />
        </View>

        <View className="flex-1">
          <Button
            compact
            variant="secondary"
            title="Pilih Galeri"
            disabled={busy}
            onPress={() => void launch("gallery")}
          />
        </View>
      </View>
    </View>
  );
}
