import { useMemo as useThemeMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Text, StyleSheet } from "react-native";
import {
  Button,
  Card,
  KeyValue,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { listMerchantOrders } from "@/lib/api/food";
import { getMerchantProfile, setMerchantOpen } from "@/lib/api/resources";
import { foodKeys } from "@/lib/food-query-keys";
import { useAppTheme } from "@/stores/theme-store";

export default function MerchantHome() {
  const { styles } = useScreenStyles();
  const router = useRouter();
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ["merchant", "profile"],
    queryFn: getMerchantProfile,
  });
  const orders = useQuery({
    queryKey: foodKeys.merchantOrders,
    queryFn: () => listMerchantOrders(1),
    refetchInterval: 10_000,
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
  const count = (status: string) =>
    orders.data?.data.filter((order) => order.status === status).length ?? 0;
  return (
    <Screen>
      <PageHeader
        eyebrow="Merchant"
        title={profile.data?.name ?? "Dashboard merchant"}
        description="Ringkasan operasional toko Anda."
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
              value={profile.data.is_open ? "Buka" : "Tutup"}
            />
            <KeyValue
              label="Status akun"
              value={profile.data.is_active ? "Aktif" : "Tidak aktif"}
            />
            <KeyValue
              label="Kategori"
              value={profile.data.category?.name ?? "-"}
            />
            <KeyValue
              label="Jumlah produk"
              value={(profile.data.products ?? []).length}
            />
            <Button
              title={profile.data.is_open ? "Tutup toko" : "Buka toko"}
              variant={profile.data.is_open ? "secondary" : "primary"}
              loading={mutation.isPending}
              onPress={() => mutation.mutate(!profile.data!.is_open)}
            />
          </Card>
          <Card>
            <Text style={styles.heading}>Order Food terbaru</Text>
            <KeyValue label="Pending / baru" value={count("pending")} />
            <KeyValue label="Preparing" value={count("preparing")} />
            <KeyValue
              label="Ready for pickup"
              value={count("ready_for_pickup")}
            />
            <Text style={styles.muted}>
              Ringkasan berdasarkan halaman order terbaru karena backend belum
              menyediakan endpoint agregat.
            </Text>
            <Button
              title="Kelola Pesanan"
              onPress={() => router.push("/(merchant)/orders")}
            />
          </Card>
          <Card>
            <Button
              title="Kelola Produk"
              variant="secondary"
              onPress={() => router.push("/(merchant)/products")}
            />
            <KeyValue label="Telepon" value={profile.data.phone} />
            <KeyValue label="Alamat" value={profile.data.address} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  heading: { color: colors.text, fontWeight: "800", fontSize: 18 },
  muted: { color: colors.muted, lineHeight: 20 },
});
