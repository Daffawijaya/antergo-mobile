import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui";
import {
    optimizePhoto,
    type OptimizedPhoto,
    type PhotoKind,
} from "@/lib/image-upload";

type PhotoInputProps = {
  label: string;
  helper: string;
  kind: PhotoKind;
  value?: OptimizedPhoto;
  onChange: (value?: OptimizedPhoto) => void;
  document?: boolean;
};

export function PhotoInput({
  label,
  helper,
  kind,
  value,
  onChange,
  document: isDocument = false,
}: PhotoInputProps) {
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }, []);

  const closeCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
    setCameraError(null);
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

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
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1920,
          },
          height: {
            ideal: 1080,
          },
        },
        audio: false,
      });

      streamRef.current = stream;

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
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

    if (!video || !cameraReady) {
      return;
    }

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

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Foto tidak dapat diproses.");
      }

      context.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result: Blob | null) => {
            if (!result) {
              reject(new Error("Foto tidak dapat diproses."));
              return;
            }

            resolve(result);
          },
          "image/jpeg",
          0.92,
        );
      });

      const uri = URL.createObjectURL(blob);

      const photo: OptimizedPhoto = {
        uri,
        name: `antergo-${kind}-${Date.now()}.jpg`,
        type: "image/jpeg",
        width,
        height,
      };

      if (value?.uri.startsWith("blob:")) {
        URL.revokeObjectURL(value.uri);
      }

      onChange(photo);
      closeCamera();
    } catch (error) {
      Alert.alert(
        "Gagal mengambil foto",
        error instanceof Error ? error.message : "Silakan coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const chooseFromGallery = async () => {
    try {
      setBusy(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const photo = await optimizePhoto(result.assets[0], kind);

      if (value?.uri.startsWith("blob:")) {
        URL.revokeObjectURL(value.uri);
      }

      onChange(photo);
    } catch (error) {
      Alert.alert(
        "Foto gagal diproses",
        error instanceof Error ? error.message : "Silakan pilih foto lain.",
      );
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = () => {
    if (busy) {
      return;
    }

    if (value?.uri.startsWith("blob:")) {
      URL.revokeObjectURL(value.uri);
    }

    onChange(undefined);
  };

  return (
    <>
      <View className="gap-2 border-b border-border pb-5">
        <Text className="text-base font-medium text-foreground">
          {label} <Text className="text-red-500">*</Text>
        </Text>

        <Text className="text-sm leading-5 text-muted">{helper}</Text>

        <View
          className={`relative overflow-hidden rounded-xl border border-border bg-surface-muted ${
            isDocument ? "aspect-[1.58]" : "aspect-[4/3]"
          }`}
        >
          {value ? (
            <>
              <img
                src={value.uri}
                alt={label}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
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
              onPress={() => void startCamera()}
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
              onPress={() => void startCamera()}
            />
          </View>

          <View className="flex-1">
            <Button
              compact
              variant="secondary"
              title="Pilih Galeri"
              disabled={busy}
              onPress={() => void chooseFromGallery()}
            />
          </View>
        </View>
      </View>

      <Modal
        visible={cameraOpen}
        animationType="fade"
        transparent
        onRequestClose={closeCamera}
      >
        <View className="flex-1 bg-black/80 p-4">
          <View className="mx-auto w-full max-w-3xl flex-1 justify-center">
            <View className="overflow-hidden rounded-2xl bg-black">
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: isDocument ? "1.58" : "4 / 3",
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

            <View className="mt-4 gap-3 rounded-2xl bg-surface p-4">
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
