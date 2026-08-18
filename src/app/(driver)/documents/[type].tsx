import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { PencilIcon } from "@/components/brand-icons";
import {
  BackButton,
  Button,
  FormField,
  Notice,
  Screen,
  StatusState,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { listDriverDocuments, updateDriverDocument } from "@/lib/api/resources";
import { DOC_LABELS } from "@/lib/driver-documents";
import { optimizePhoto, type OptimizedPhoto } from "@/lib/image-upload";
import type { DriverDocumentType } from "@/types/api";
import { useAppTheme } from "@/stores/theme-store";
import { driverDocumentsKey } from "./index";

const VALID_TYPES: DriverDocumentType[] = ["ktp", "sim_a", "sim_c"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function DocumentDetailScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { colors } = useAppTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const docType = VALID_TYPES.find((t) => t === type);

  /* ---------- editing state ---------- */
  const [photo, setPhoto] = useState<OptimizedPhoto>();
  const [expiresAt, setExpiresAt] = useState("");

  /* ---------- original values (from backend) ---------- */
  const [origPhotoUrl, setOrigPhotoUrl] = useState<string | null>(null);
  const [origExpiresAt, setOrigExpiresAt] = useState("");
  const [initialized, setInitialized] = useState(false);

  /* ---------- fetch document list ---------- */
  const query = useQuery({
    queryKey: driverDocumentsKey,
    queryFn: listDriverDocuments,
    enabled: !!docType,
  });
  const doc = query.data?.find((d) => d.type === docType);

  /* ---------- seed form from backend on first load ---------- */
  useEffect(() => {
    if (doc && !initialized) {
      setOrigPhotoUrl(doc.photo_url ?? null);
      setOrigExpiresAt(doc.expires_at ?? "");
      setExpiresAt(doc.expires_at ?? "");
      setInitialized(true);
    }
  }, [doc, initialized]);

  /* ---------- change detection (compare against originals) ---------- */
  const photoChanged = photo !== undefined;
  const dateChanged = expiresAt.trim() !== origExpiresAt;
  const dateValid = expiresAt.trim() === "" || DATE_RE.test(expiresAt.trim());
  const hasChanges = (photoChanged || dateChanged) && dateValid;

  /* ---------- save ---------- */
  const save = useMutation({
    mutationFn: updateDriverDocument,
    onSuccess: async () => {
      /* Re-fetch and update originals so the button goes disabled again */
      const docs = await client.fetchQuery({
        queryKey: driverDocumentsKey,
        queryFn: listDriverDocuments,
      });
      const updatedDoc = docs?.find((d) => d.type === docType);
      if (updatedDoc) {
        setOrigPhotoUrl(updatedDoc.photo_url ?? null);
        setOrigExpiresAt(updatedDoc.expires_at ?? "");
        setExpiresAt(updatedDoc.expires_at ?? "");
      }
      setPhoto(undefined);
    },
  });

  /* ---------- pick photo ---------- */
  const handlePickPhoto = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin galeri diperlukan",
          "Aktifkan izin galeri untuk memilih foto.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) return;

      const optimized = await optimizePhoto(result.assets[0], "document");
      setPhoto(optimized);
    } catch (error) {
      Alert.alert(
        "Foto gagal diproses",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    }
  };

  const displayPhotoUrl = photo?.uri ?? origPhotoUrl;

  /* ---------- invalid type guard ---------- */
  if (!docType) {
    return (
      <Screen className="gap-5 px-4 pt-2">
        <BackButton
          onPress={() => router.replace("/(driver)/documents")}
        />
        <Notice tone="danger">Jenis dokumen tidak valid.</Notice>
      </Screen>
    );
  }

  return (
    <Screen className="gap-5 px-4 pt-2">
      {/* Header */}
      <BackButton
        onPress={() => router.replace("/(driver)/documents")}
        title={DOC_LABELS[docType]}
      />

      {query.isLoading ? (
        <StatusState type="loading" />
      ) : query.isError ? (
        <StatusState type="error" message={getApiErrorMessage(query.error)} />
      ) : (
        <>
          {/* ── Foto SIM ── */}
          <Pressable onPress={handlePickPhoto} className="relative">
            {displayPhotoUrl ? (
              <View className="overflow-hidden rounded-2xl border border-border bg-surface-muted aspect-[1.58]">
                <Image
                  source={{ uri: displayPhotoUrl }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View className="items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted aspect-[1.58]">
                <Text className="text-sm text-muted">Belum ada foto SIM</Text>
              </View>
            )}
            {/* Pencil overlay – bottom-right */}
            <View className="absolute bottom-2 right-2 rounded-full bg-surface p-2 shadow-sm">
              <PencilIcon size={16} color={colors.text} />
            </View>
          </Pressable>

          {/* ── Berlaku Sampai ── */}
          <FormField
            label="Berlaku Sampai"
            value={expiresAt}
            onChangeText={setExpiresAt}
            placeholder="YYYY-MM-DD (contoh: 2030-12-31)"
            autoCapitalize="none"
            autoCorrect={false}
            error={
              expiresAt.trim() && !dateValid
                ? "Format tanggal harus YYYY-MM-DD."
                : undefined
            }
          />

          {/* ── Error ── */}
          {save.isError ? (
            <Notice tone="danger">{getApiErrorMessage(save.error)}</Notice>
          ) : null}

          {/* ── Simpan Perubahan ── */}
          <Button
            title="Simpan Perubahan"
            disabled={!hasChanges}
            loading={save.isPending}
            className="rounded-full"
            onPress={() =>
              save.mutate({
                type: docType,
                photo,
                expires_at: expiresAt.trim() || undefined,
              })
            }
          />
        </>
      )}
    </Screen>
  );
}
