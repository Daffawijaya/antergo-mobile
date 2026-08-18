import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import {
  BackButton,
  Screen,
  StatusState,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { listDriverDocuments } from "@/lib/api/resources";
import { DOC_LABELS, isDateExpired } from "@/lib/driver-documents";
import { useAppTheme } from "@/stores/theme-store";
import type { DriverDocumentType } from "@/types/api";

export const driverDocumentsKey = ["driver", "documents"] as const;

const DOC_TYPES: DriverDocumentType[] = ["ktp", "sim_a", "sim_c"];

export default function DocumentsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const query = useQuery({
    queryKey: driverDocumentsKey,
    queryFn: listDriverDocuments,
  });
  const docs = query.data ?? [];

  return (
    <Screen className="gap-5 px-4 pt-2">
      <BackButton
        onPress={() => router.replace("/(driver)/profile")}
        title="Dokumen & SIM"
      />
      {query.isLoading ? (
        <StatusState type="loading" />
      ) : query.isError ? (
        <StatusState type="error" message={getApiErrorMessage(query.error)} />
      ) : (
        <View className="gap-1">
          {DOC_TYPES.map((type) => {
            const doc = docs.find((d) => d.type === type);
            const expired = isDateExpired(doc?.expires_at);
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/(driver)/documents/[type]",
                    params: { type },
                  })
                }
                className="min-h-16 flex-row items-center gap-3 border-b border-border py-3 active:opacity-70"
              >
                <View className="min-w-0 flex-1">
                  <Text className="font-bold text-base text-foreground">
                    {DOC_LABELS[type]}
                  </Text>
                  {doc?.uploaded ? (
                    <Text className="text-sm text-muted">
                      {expired
                        ? "Kedaluwarsa"
                        : doc.expires_at
                          ? `Berlaku s.d. ${doc.expires_at}`
                          : "Tersimpan"}
                    </Text>
                  ) : (
                    <Text className="text-sm text-muted">Belum diunggah</Text>
                  )}
                </View>
                <AppIcon name="forward" size={20} color={colors.muted} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
