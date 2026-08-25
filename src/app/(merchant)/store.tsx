import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import {
  Button,
  Card,
  KeyValue,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { getMerchantProfile, setMerchantOpen } from "@/lib/api/resources";
import { useAppTheme } from "@/stores/theme-store";

export default function MerchantStoreScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { colors } = useAppTheme();
  const profile = useQuery({
    queryKey: ["merchant", "profile"],
    queryFn: getMerchantProfile,
  });
  const mutation = useMutation({
    mutationFn: setMerchantOpen,
    onSuccess: (merchant) =>
      client.setQueryData(
        ["merchant", "profile"],
        (current: typeof profile.data) =>
          current ? { ...current, ...merchant } : current,
      ),
  });

  return (
    <Screen>
      <PageHeader
        eyebrow={profile.data?.name ?? "Toko"}
        title="Kelola Toko"
        description="Status, produk, jam operasional, dan info toko."
      />
      {profile.isLoading ? (
        <StatusState type="loading" />
      ) : profile.isError ? (
        <StatusState
          type="error"
          message={getApiErrorMessage(profile.error)}
          action={
            <Button title="Coba lagi" onPress={() => profile.refetch()} />
          }
        />
      ) : profile.data ? (
        <>
          <Card>
            <KeyValue
              label="Status toko"
              value={profile.data.is_open_now ? "Buka" : "Tutup"}
            />
            <KeyValue
              label="Saklar manual"
              value={profile.data.is_open ? "Aktif" : "Nonaktif"}
            />
            <KeyValue
              label="Status akun"
              value={profile.data.is_active ? "Aktif" : "Tidak aktif"}
            />
            <Button
              title={profile.data.is_open ? "Tutup toko" : "Buka toko"}
              variant={profile.data.is_open ? "secondary" : "primary"}
              loading={mutation.isPending}
              onPress={() => mutation.mutate(!profile.data!.is_open)}
            />
          </Card>
          <Card>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>
              Pengaturan
            </Text>
            <Button
              title="Kelola Produk"
              variant="secondary"
              onPress={() => router.push("/(merchant)/products")}
            />
            <Button
              title="Jam Operasional"
              variant="secondary"
              onPress={() => router.push("/(merchant)/hours")}
            />
          </Card>
          <Card>
            <KeyValue label="Telepon" value={profile.data.phone} />
            <KeyValue label="Alamat" value={profile.data.address} />
            {profile.data.notes ? (
              <KeyValue label="Patokan" value={profile.data.notes} />
            ) : null}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
