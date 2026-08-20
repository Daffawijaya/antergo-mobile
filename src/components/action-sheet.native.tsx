import * as ImagePicker from "expo-image-picker";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import {
  optimizePhoto,
  type OptimizedPhoto,
  type PhotoKind,
} from "@/lib/image-upload";
import { HiMiniCameraIcon, TbPhotoIcon, TbTrashXIcon } from "./brand-icons";

/* ── shared types ───────────────────────────────────────────── */

export interface ActionSheetItem {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

export interface PhotoModeConfig {
  kind: PhotoKind;
  onPicked: (photo: OptimizedPhoto) => void;
  remove?: {
    label?: string;
    onRemove: () => void;
  };
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  items?: ActionSheetItem[];
  photoMode?: PhotoModeConfig;
}

/* ── native component ───────────────────────────────────────── */

export function ActionSheet({
  visible,
  onClose,
  items,
  photoMode,
}: ActionSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(screenHeight);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 50,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: screenHeight,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const launchPhoto = useCallback(
    async (source: "camera" | "gallery") => {
      if (!photoMode) return;

      try {
        setBusy(true);

        if (source === "camera") {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert(
              "Izin kamera diperlukan",
              "Aktifkan izin kamera untuk mengambil foto.",
            );
            return;
          }
        } else {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
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
                quality: 1,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 1,
              });

        onClose(); // Close the sheet immediately after the picker returns

        if (result.canceled || !result.assets[0]) {
          return;
        }

        const photo = await optimizePhoto(result.assets[0], photoMode.kind);
        photoMode.onPicked(photo);
      } catch (error) {
        onClose();
        Alert.alert(
          "Foto gagal diproses",
          error instanceof Error ? error.message : "Coba lagi.",
        );
      } finally {
        setBusy(false);
      }
    },
    [photoMode, onClose],
  );

  const handleRemove = useCallback(() => {
    if (!photoMode?.remove) return;
    onClose();
    photoMode.remove.onRemove();
  }, [photoMode, onClose]);

  const renderItems: ActionSheetItem[] = photoMode
    ? [
        {
          icon: <HiMiniCameraIcon size={16} color="#b45309" />,
          label: busy ? "Mengambil foto…" : "Ambil dengan Kamera",
          onPress: () => void launchPhoto("camera"),
        },
        {
          icon: <TbPhotoIcon size={16} color="#b45309" />,
          label: busy ? "Memilih foto…" : "Pilih dari File",
          onPress: () => void launchPhoto("gallery"),
        },
        ...(photoMode.remove
          ? [
              {
                icon: <TbTrashXIcon size={16} color="#dc2626" />,
                label: photoMode.remove.label ?? "Hapus Foto",
                onPress: handleRemove,
                danger: true as const,
              },
            ]
          : []),
      ]
    : (items ?? []);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      className="absolute inset-0 justify-end"
      style={{
        opacity: overlayOpacity,
        backgroundColor: "rgba(0,0,0,0.5)",
      }}
    >
      <Pressable className="flex-1 justify-end" onPress={onClose}>
        <Animated.View
          className="w-full rounded-t-2xl bg-surface px-5 py-5 pb-20"
          style={{ transform: [{ translateY: sheetTranslateY }] }}
          onStartShouldSetResponder={() => true}
        >
          {renderItems.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => {
                if (busy) return;
                onClose();
                item.onPress();
              }}
              className="flex-row items-center gap-3 py-2.5 active:opacity-70"
            >
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  item.danger ? "bg-gray-100" : "bg-yellow-100"
                }`}
              >
                {item.icon}
              </View>
              <Text
                className={`text-sm font-medium ${
                  item.danger ? "text-danger" : "text-foreground"
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
