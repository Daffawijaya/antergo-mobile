import * as ImagePicker from "expo-image-picker";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { Button } from "@/components/ui";
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

/* ── web component ──────────────────────────────────────────── */

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

  /* ── camera state (web getUserMedia) ─────────────────────── */
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const closeCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
    setCameraError(null);
  }, [stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ── slide / fade animation ─────────────────────────────── */

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

  /* ── camera: start / capture (web) ──────────────────────── */

  const startCamera = async () => {
    try {
      setCameraError(null);
      setCameraReady(false);
      setCameraOpen(true);

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error("Browser ini tidak mendukung akses kamera.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const video = videoRef.current;
      if (!video) {
        stopCamera();
        throw new Error("Preview kamera tidak dapat ditampilkan.");
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      setCameraReady(true);
    } catch (error) {
      stopCamera();
      const message =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError")
          ? "Izin kamera ditolak. Izinkan akses kamera melalui pengaturan situs Chrome."
          : error instanceof Error
            ? error.message
            : "Kamera tidak dapat dibuka.";
      setCameraError(message);
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady || !photoMode) return;

    try {
      setBusy(true);

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) {
        throw new Error("Kamera belum siap. Silakan coba lagi.");
      }

      const canvas = window.document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Foto tidak dapat diproses.");

      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (!result) reject(new Error("Foto tidak dapat diproses."));
            else resolve(result);
          },
          "image/jpeg",
          0.92,
        );
      });

      const uri = URL.createObjectURL(blob);
      const photo: OptimizedPhoto = {
        uri,
        name: `antergo-${photoMode.kind}-${Date.now()}.jpg`,
        type: "image/jpeg",
        width,
        height,
      };

      closeCamera();
      onClose();
      photoMode.onPicked(photo);
    } catch (error) {
      Alert.alert(
        "Gagal mengambil foto",
        error instanceof Error ? error.message : "Silakan coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  /* ── gallery (ImagePicker works on web for file picking) ─── */

  const pickFromGallery = useCallback(async () => {
    if (!photoMode) return;

    try {
      setBusy(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) return;

      const photo = await optimizePhoto(result.assets[0], photoMode.kind);
      onClose();
      photoMode.onPicked(photo);
    } catch (error) {
      Alert.alert(
        "Foto gagal diproses",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }, [photoMode, onClose]);

  const handleRemove = useCallback(() => {
    if (!photoMode?.remove) return;
    onClose();
    photoMode.remove.onRemove();
  }, [photoMode, onClose]);

  /* ── items to render ─────────────────────────────────────── */

  const renderItems: ActionSheetItem[] = photoMode
    ? [
        {
          icon: <HiMiniCameraIcon size={16} color="#b45309" />,
          label: busy ? "Mengambil foto…" : "Ambil dengan Kamera",
          onPress: () => void startCamera(),
        },
        {
          icon: <TbPhotoIcon size={16} color="#b45309" />,
          label: busy ? "Memilih foto…" : "Pilih dari File",
          onPress: () => void pickFromGallery(),
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

  /* ── render ──────────────────────────────────────────────── */

  return (
    <>
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

      {/* ── Camera Modal (web) ──────────────────────────────── */}
      <Modal
        visible={cameraOpen}
        animationType="fade"
        transparent
        onRequestClose={closeCamera}
      >
        <View className="flex-1 bg-black/80 p-4">
          <View className="mx-auto w-full max-w-3xl flex-1 justify-center">
            <View className="overflow-hidden rounded-3xl bg-black">
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4 / 3",
                  background: "#000",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                {!cameraReady && !cameraError && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    Membuka kamera...
                  </div>
                )}

                {cameraError && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 24,
                      color: "white",
                      textAlign: "center",
                    }}
                  >
                    {cameraError}
                  </div>
                )}
              </div>
            </View>

            <View className="mt-4 gap-3 rounded-3xl bg-surface p-4">
              {cameraError ? (
                <Button title="Coba Lagi" onPress={() => void startCamera()} />
              ) : (
                <Button
                  title={busy ? "Memproses..." : "Ambil Foto"}
                  disabled={busy || !cameraReady}
                  onPress={() => void capturePhoto()}
                />
              )}

              <Button
                variant="secondary"
                title="Tutup Kamera"
                disabled={busy}
                onPress={closeCamera}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
