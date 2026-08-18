import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Text, View } from "react-native";

import { PhotoInput } from "@/components/photo-input";
import {
  BackButton,
  Button,
  FormField,
  Notice,
  Screen,
  StatusState,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  deleteDriverDocument,
  listDriverDocuments,
  updateDriverDocument,
} from "@/lib/api/resources";
import { driverKeys } from "@/lib/driver-query-keys";
import { DOC_LABELS } from "@/lib/driver-documents";
import type { OptimizedPhoto } from "@/lib/image-upload";
import type { DriverDocumentType } from "@/types/api";
import { driverDocumentsKey } from "./index";

const VALID_TYPES: DriverDocumentType[] = ["ktp", "sim_a", "sim_c"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function DocumentDetailScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { type } = useLocalSearchParams<{ type: string }>();
  const docType = VALID_TYPES.find((t) => t === type);
  const [photo, setPhoto] = useState<OptimizedPhoto>();
  const [expiresAt, setExpiresAt] = useState("");
  const [initialized, setInitialized] = useState(false);

  const query = useQuery({
    queryKey: driverDocumentsKey,
    queryFn: listDriverDocuments,
    enabled: !!docType,
  });
  const doc = query.data?.find((d) => d.type === docType);
  const uploaded = doc?.uploaded === true;

  useEffect(() => {
    if (doc && !initialized) {
      setExpiresAt(doc.expires_at ?? "");
      setInitialized(true);
    }
  }, [doc, initialized]);

  const dateValid = expiresAt.trim() === "" || DATE_RE.test(expiresAt.trim());
  const valid = (photo !== undefined || uploaded) && dateValid;

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: driverDocumentsKey });
    await client.invalidateQueries({ queryKey: driverKeys.profile });
  };

  const save = useMutation({
    mutationFn: updateDriverDocument,
    onSuccess: async () => {
      await refresh();
      router.back();
    },
  });

  const remove = useMutation({
    mutationFn: deleteDriverDocument,
    onSuccess: async () => {
      await refresh();
      router.back();
    },
  });

  const confirmDelete = () => {
    Alert.alert(
      `Hapus ${DOC_LABELS[docType ?? "ktp"]}?`,
      "Dokumen dan fotonya akan dihapus permanen dari akun driver Anda.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => docType && remove.mutate(docType),
        },
      ],
    );
  };

  if (!docType) {
    return (
      <Screen className="gap-5 px-4 pt-2">
        <View className="flex-row items-center justify-between">
          <BackButton onPress={() => router.back()} />
          <View className="h-10 w-10" />
        </View>
        <Notice tone="danger">Jenis dokumen tidak valid.</Notice>
      </Screen>
    );
  }

  return (
    <Screen className="gap-5 px-4 pt-2">
      <View className="flex-row items-center justify-between">
        <BackButton onPress={() => router.back()} />
        <Text className="font-bold text-lg text-foreground">
          {DOC_LABELS[docType]}
        </Text>
        <View className="h-10 w-10" />
      </View>
      {query.isLoading ? (
        <StatusState type="loading" />
      ) : query.isError ? (
        <StatusState type="error" message={getApiErrorMessage(query.error)} />
      ) : (
        <>
          <View className="overflow-hidden rounded-2xl border border-border bg-surface-muted">
            {doc?.photo_url ? (
              <Image
                source={{ uri: doc.photo_url }}
                className="h-56 w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-40 items-center justify-center">
                <Text className="text-sm text-muted">Belum ada foto dokumen</Text>
              </View>
            )}
          </View>
          <View className="gap-2">
            <Text className="font-bold text-xl text-foreground">
              {DOC_LABELS[docType]}
            </Text>
            {uploaded ? (
              <Text className="text-muted">
                {doc?.expires_at
                  ? `Berlaku s.d. ${doc.expires_at}`
                  : "Tersimpan · berlaku sampai belum diisi"}
              </Text>
            ) : (
              <Text className="text-muted">
                Belum diunggah — upload foto untuk melengkapi dokumen.
              </Text>
            )}
          </View>
          <View className="gap-5 border-t border-border pt-5">
            <Text className="font-bold text-xl text-foreground">
              {uploaded ? "Perbarui dokumen" : "Upload dokumen"}
            </Text>
            <PhotoInput
              document
              label={`Foto ${DOC_LABELS[docType]}`}
              helper="Pastikan foto dokumen terlihat jelas dan tidak terpotong."
              kind="document"
              value={photo}
              onChange={setPhoto}
            />
            <FormField
              label="Berlaku sampai"
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
            {save.isError ? (
              <Notice tone="danger">{getApiErrorMessage(save.error)}</Notice>
            ) : null}
            <Button
              title="Simpan Perubahan"
              disabled={!valid}
              loading={save.isPending}
              onPress={() =>
                save.mutate({
                  type: docType,
                  photo,
                  expires_at: expiresAt.trim() || undefined,
                })
              }
            />
            {uploaded ? (
              <Button
                variant="danger"
                title="Hapus Dokumen"
                loading={remove.isPending}
                onPress={confirmDelete}
              />
            ) : null}
          </View>
        </>
      )}
    </Screen>
  );
}
