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
  getDriverProfile,
  updateDriverDocument,
} from "@/lib/api/resources";
import type { DriverDocumentType } from "@/types/api";
import { driverKeys } from "@/lib/driver-query-keys";
import type { OptimizedPhoto } from "@/lib/image-upload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

const DOC_TYPES: DriverDocumentType[] = ["ktp", "sim_a", "sim_c"];

const DOC_LABELS: Record<DriverDocumentType, string> = {
  ktp: "KTP",
  sim_a: "SIM A",
  sim_c: "SIM C",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function DocumentsScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: driverKeys.profile,
    queryFn: getDriverProfile,
  });
  const [editing, setEditing] = useState<DriverDocumentType | null>(null);
  const [photo, setPhoto] = useState<OptimizedPhoto>();
  const [expiresAt, setExpiresAt] = useState("");
  const [saved, setSaved] = useState(false);

  const docs = query.data?.documents ?? [];
  const editingDoc = editing ? docs.find((d) => d.type === editing) : undefined;
  const dateValid = expiresAt.trim() === "" || DATE_RE.test(expiresAt.trim());
  // A document that was never uploaded requires a photo; otherwise the user
  // may only update the expiry date.
  const valid = (photo !== undefined || editingDoc?.uploaded === true) && dateValid;

  const refresh = async () =>
    client.invalidateQueries({ queryKey: driverKeys.profile });

  const save = useMutation({
    mutationFn: updateDriverDocument,
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      setPhoto(undefined);
      setExpiresAt("");
      setSaved(true);
    },
  });

  const openForm = (type: DriverDocumentType) => {
    const doc = docs.find((d) => d.type === type);
    setEditing(type);
    setPhoto(undefined);
    setExpiresAt(doc?.expires_at ?? "");
    setSaved(false);
  };

  const closeForm = () => {
    setEditing(null);
    setPhoto(undefined);
    setExpiresAt("");
    setSaved(false);
  };

  return (
    <Screen className="gap-5 px-4 pt-2">
      <View className="flex-row items-center justify-between">
        <BackButton onPress={() => router.back()} />
        <Text className="font-bold text-lg text-foreground">Dokumen & SIM</Text>
        <View className="h-10 w-10" />
      </View>
      {query.isLoading ? (
        <StatusState type="loading" />
      ) : query.isError ? (
        <StatusState type="error" message={getApiErrorMessage(query.error)} />
      ) : (
        <View className="gap-4">
          {DOC_TYPES.map((type) => {
            const doc = docs.find((d) => d.type === type);
            return (
              <View key={type} className="gap-2 border-b border-border pb-4">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="font-bold text-lg text-foreground">
                      {DOC_LABELS[type]}
                    </Text>
                    {doc?.uploaded ? (
                      <Text className="text-muted">
                        {doc.expires_at
                          ? `Berlaku s.d. ${doc.expires_at}`
                          : "Tersimpan · berlaku sampai belum diisi"}
                      </Text>
                    ) : (
                      <Text className="text-muted">Belum diunggah</Text>
                    )}
                  </View>
                  <Button
                    compact
                    variant="secondary"
                    title={doc?.uploaded ? "Perbarui" : "Upload"}
                    onPress={() => openForm(type)}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
      {editing ? (
        <View className="gap-5 border-t border-border pt-5">
          <Text className="font-bold text-xl text-foreground">
            {editingDoc?.uploaded
              ? `Perbarui ${DOC_LABELS[editing]}`
              : `Upload ${DOC_LABELS[editing]}`}
          </Text>
          <PhotoInput
            document
            label={`Foto ${DOC_LABELS[editing]}`}
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
          {saved ? (
            <Notice tone="success">Dokumen berhasil disimpan.</Notice>
          ) : null}
          <Button
            title="Simpan Dokumen"
            disabled={!valid}
            loading={save.isPending}
            onPress={() =>
              save.mutate({
                type: editing,
                photo,
                expires_at: expiresAt.trim() || undefined,
              })
            }
          />
          <Button
            variant="secondary"
            title="Batal"
            disabled={save.isPending}
            onPress={closeForm}
          />
        </View>
      ) : null}
    </Screen>
  );
}
