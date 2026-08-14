import * as Location from "expo-location";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, FormField, Notice, PageHeader, Screen } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { listMerchantCategories, registerMerchant } from "@/lib/api/resources";
import { useAuthStore } from "@/stores/auth-store";

export default function MerchantRegisterScreen() {
  const router = useRouter();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const user = useAuthStore((state) => state.user);
  const [categoryId, setCategoryId] = useState<number>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number>();
  const [longitude, setLongitude] = useState<number>();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const categories = useQuery({
    queryKey: ["merchant-categories"],
    queryFn: listMerchantCategories,
  });
  const mutation = useMutation({
    mutationFn: registerMerchant,
    onSuccess: async () => {
      const refreshed = await refreshUser();
      if (refreshed?.roles.includes("merchant"))
        await setActiveRole("merchant");
    },
  });
  const locateStore = async () => {
    try {
      setLocating(true);
      setLocationError("");
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Izin lokasi diperlukan.");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
    } catch (cause) {
      setLocationError(
        cause instanceof Error ? cause.message : "Lokasi tidak tersedia.",
      );
    } finally {
      setLocating(false);
    }
  };
  const invalid =
    !name.trim() ||
    !phone.trim() ||
    !address.trim() ||
    latitude === undefined ||
    longitude === undefined;
  return (
    <Screen>
      <Button
        title="Kembali"
        variant="secondary"
        onPress={() => router.back()}
      />
      <PageHeader
        eyebrow="PENDAFTARAN"
        title="Daftar Merchant"
        description="Daftarkan toko agar dapat mengelola produk dan pesanan."
      />
      {categories.data?.length ? (
        <>
          <Text style={styles.label}>Kategori toko (opsional)</Text>
          <View style={styles.categories}>
            {categories.data.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setCategoryId(category.id)}
                style={[
                  styles.category,
                  categoryId === category.id && styles.categoryActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    categoryId === category.id && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <FormField
        label="Nama toko"
        value={name}
        onChangeText={setName}
        placeholder="Nama merchant"
      />
      <FormField
        label="Deskripsi (opsional)"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Ceritakan tentang toko"
      />
      <FormField
        label="Nomor telepon toko"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <FormField
        label="Alamat toko"
        value={address}
        onChangeText={setAddress}
        multiline
        placeholder="Alamat lengkap"
      />
      <View style={styles.location}>
        <View style={styles.locationCopy}>
          <Text style={styles.locationTitle}>Lokasi toko</Text>
          <Text style={styles.locationText}>
            {latitude !== undefined
              ? `${latitude.toFixed(6)}, ${longitude?.toFixed(6)}`
              : "Belum ditentukan"}
          </Text>
        </View>
        <Button
          compact
          title={locating ? "Mencari…" : "Gunakan GPS"}
          variant="secondary"
          disabled={locating}
          onPress={() => {
            void locateStore();
          }}
        />
      </View>
      {locationError ? <Notice tone="danger">{locationError}</Notice> : null}
      {mutation.isError ? (
        <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
      ) : null}
      <Button
        title="Daftarkan Merchant"
        disabled={invalid}
        loading={mutation.isPending}
        onPress={() =>
          mutation.mutate({
            category_id: categoryId,
            name: name.trim(),
            description: description.trim() || undefined,
            phone: phone.trim(),
            address: address.trim(),
            latitude: latitude!,
            longitude: longitude!,
          })
        }
      />
      {invalid ? (
        <Text style={styles.hint}>
          Nama, telepon, alamat, dan lokasi GPS wajib diisi.
        </Text>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  label: { color: Colors.text, fontSize: 13, fontFamily: "Outfit_700Bold" },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
  },
  categoryTextActive: { color: Colors.white },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
  },
  locationCopy: { flex: 1 },
  locationTitle: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: "Outfit_700Bold",
  },
  locationText: {
    color: Colors.muted,
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
  hint: {
    color: Colors.muted,
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
});
