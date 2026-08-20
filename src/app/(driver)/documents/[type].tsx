import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { ActionSheet } from "@/components/action-sheet";
import { HiMiniCameraIcon } from "@/components/brand-icons";
import {
  BackButton,
  Button,
  FormField,
  Notice,
  Screen,
  StatusState,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { getDriverDocumentUrl, listDriverDocuments, updateDriverDocument } from "@/lib/api/resources";
import { DOC_LABELS } from "@/lib/driver-documents";
import type { OptimizedPhoto } from "@/lib/image-upload";
import type { DriverDocumentType } from "@/types/api";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";
import { driverDocumentsKey } from "./index";

const VALID_TYPES: DriverDocumentType[] = ["ktp", "sim_a", "sim_c"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** KTP does not have an expiry date (valid for life). */
const HAS_EXPIRY: Record<DriverDocumentType, boolean> = {
  ktp: false,
  sim_a: true,
  sim_c: true,
};

export default function DocumentDetailScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { colors } = useAppTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const docType = VALID_TYPES.find((t) => t === type);
  const showExpiry = docType ? HAS_EXPIRY[docType] : true;

  /* ---------- editing state ---------- */
  const [photo, setPhoto] = useState<OptimizedPhoto>();
  const [expiresAt, setExpiresAt] = useState("");
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const { t } = useTranslation();

  /* ---------- original values (from backend) ---------- */
  const [origPhotoUrl, setOrigPhotoUrl] = useState<string | null>(null);
  const [origExpiresAt, setOrigExpiresAt] = useState("");

  /* ---------- fetch document list ---------- */
  const query = useQuery({
    queryKey: driverDocumentsKey,
    queryFn: listDriverDocuments,
    enabled: !!docType,
  });
  const doc = query.data?.find((d) => d.type === docType);

  /* ---------- fetch photo URL on demand ---------- */
  const photoQuery = useQuery({
    queryKey: ["driver", "document", "url", docType],
    queryFn: () => getDriverDocumentUrl(docType!),
    enabled: !!docType && !!doc?.uploaded,
    staleTime: 300_000,
  });
  const serverPhotoUrl = photoQuery.data ?? null;

  /* ---------- seed / reset form on screen focus ---------- */
  useFocusEffect(
    useCallback(() => {
      if (doc) {
        /* Use server photo URL from the on-demand query */
        setOrigPhotoUrl(serverPhotoUrl);
        setOrigExpiresAt(doc.expires_at ?? "");
        setExpiresAt(doc.expires_at ?? "");
        setPhoto(undefined);
      } else {
        setOrigPhotoUrl(null);
        setOrigExpiresAt("");
        setExpiresAt("");
        setPhoto(undefined);
      }
    }, [doc, serverPhotoUrl]),
  );

  /* ---------- change detection (compare against originals) ---------- */
  const photoChanged = photo !== undefined;
  const dateChanged = showExpiry && expiresAt.trim() !== origExpiresAt;
  const dateValid =
    !showExpiry ||
    expiresAt.trim() === "" ||
    DATE_RE.test(expiresAt.trim());
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

  /* ---------- photo picked via ActionSheet photoMode ---------- */
  const handlePhotoPicked = (optimized: OptimizedPhoto) => {
    setPhoto(optimized);
  };

  const displayPhotoUrl = photo?.uri ?? origPhotoUrl ?? serverPhotoUrl;

  /* ---------- invalid type guard ---------- */
  if (!docType) {
    return (
      <Screen className="gap-5 px-4 pt-2">
        <BackButton
          onPress={() => router.replace("/(driver)/documents")}
        />
        <Notice tone="danger">{t("documents.invalidType")}</Notice>
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
          {/* ── Foto Dokumen ── */}
          <Pressable onPress={() => setPhotoSheetVisible(true)} className="relative">
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
                <Text className="text-sm text-muted">
                  {t("documents.noPhoto")}
                </Text>
              </View>
            )}
            {/* HiMiniCamera overlay – bottom-right */}
            <View className="absolute bottom-2 right-2 rounded-full bg-surface p-2 shadow-sm">
              <HiMiniCameraIcon size={16} color={colors.text} />
            </View>
          </Pressable>

          {/* ── Berlaku Sampai (hidden for KTP — valid for life) ── */}
          {showExpiry ? (
            <FormField
              label={t("documents.validUntilLabel")}
              value={expiresAt}
              onChangeText={setExpiresAt}
              placeholder={t("documents.dateFormat")}
              autoCapitalize="none"
              autoCorrect={false}
              error={
                expiresAt.trim() && !dateValid
                  ? t("documents.invalidDateFormat")
                  : undefined
              }
            />
          ) : null}

          {/* ── Error ── */}
          {save.isError ? (
            <Notice tone="danger">{getApiErrorMessage(save.error)}</Notice>
          ) : null}

          {/* ── Simpan Perubahan ── */}
          <Button
            title={t("documents.saveChanges")}
            disabled={!hasChanges}
            loading={save.isPending}
            className="rounded-full"
            onPress={() =>
              save.mutate({
                type: docType,
                photo,
                expires_at:
                  showExpiry && expiresAt.trim()
                    ? expiresAt.trim()
                    : undefined,
              })
            }
          />
        </>
      )}

      <ActionSheet
        visible={photoSheetVisible}
        onClose={() => setPhotoSheetVisible(false)}
        photoMode={{
          kind: "document",
          onPicked: handlePhotoPicked,
          remove: photo
            ? { label: t("accountDetail.removePhoto"), onRemove: () => setPhoto(undefined) }
            : undefined,
        }}
      />
    </Screen>
  );
}
