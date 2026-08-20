import { CustomerPageHeader } from "@/components/customer-page";
import { PhotoInput } from "@/components/photo-input";
import { Button, FormField, Notice, Screen } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { listMerchantCategories, registerMerchant } from "@/lib/api/resources";
import type { OptimizedPhoto } from "@/lib/image-upload";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/i18n";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
export default function MerchantRegisterScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refreshUser);
  const setRole = useAuthStore((s) => s.setActiveRole);
  const [category_id, setCategory] = useState<number>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [latitude, setLat] = useState<number>();
  const [longitude, setLng] = useState<number>();
  const [image, setImage] = useState<OptimizedPhoto>();
  const [error, setError] = useState("");
  const { t } = useTranslation();
  const categories = useQuery({
    queryKey: ["merchant-categories"],
    queryFn: listMerchantCategories,
  });
  const goBack = () =>
    returnTo ? router.replace(returnTo as never) : router.back();
  const mutation = useMutation({
    mutationFn: registerMerchant,
    onSuccess: async () => {
      const u = await refresh();
      if (u?.roles.includes("merchant")) await setRole("merchant");
    },
  });
  const locate = async () => {
    try {
      setError("");
      const p = await Location.requestForegroundPermissionsAsync();
      if (!p.granted) throw new Error("Izin lokasi diperlukan.");
      const l = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLat(l.coords.latitude);
      setLng(l.coords.longitude);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lokasi tidak tersedia.");
    }
  };
  const invalid =
    !category_id ||
    !name.trim() ||
    !phone.trim() ||
    !address.trim() ||
    latitude === undefined ||
    longitude === undefined ||
    !image;
  return (
    <Screen className="gap-5 px-4 pt-2">
      <CustomerPageHeader
        title={t("merchantRegister.title")}
        subtitle={t("merchantRegister.subtitle")}
        onBack={goBack}
      />
      <View className="gap-5">
        <Text className="font-bold text-xl text-foreground">
          {t("merchantRegister.businessInfo")}
        </Text>
        <PhotoInput
          label={t("merchantRegister.businessPhoto")}
          helper={t("merchantRegister.businessPhotoHint")}
          kind="merchant"
          value={image}
          onChange={setImage}
        />
        <View className="gap-2 border-b border-border pb-5">
          <Text className="font-medium text-base text-foreground">
            {t("merchantRegister.category")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.data?.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                className={`rounded-full border px-4 py-2 ${category_id === c.id ? "border-brand bg-brand" : "border-border bg-surface"}`}
              >
                <Text
                  className={
                    category_id === c.id ? "text-on-brand" : "text-foreground"
                  }
                >
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <FormField label={t("merchantRegister.businessName")} value={name} onChangeText={setName} />
        <FormField
          label={t("merchantRegister.description")}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <FormField
          label={t("merchantRegister.phoneNumber")}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <FormField
          label={t("merchantRegister.address")}
          value={address}
          onChangeText={setAddress}
          multiline
        />
        <View className="gap-2 border-b border-border pb-5">
          <Text className="font-medium text-base text-foreground">
            {t("merchantRegister.storeLocation")}
          </Text>
          <Text className="text-sm text-muted">
            {latitude === undefined
              ? t("merchantRegister.locationNotSet")
              : `${latitude.toFixed(6)}, ${longitude?.toFixed(6)}`}
          </Text>
          <Button
            variant="secondary"
            title={t("merchantRegister.useGps")}
            onPress={() => void locate()}
          />
        </View>
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {mutation.isError ? (
        <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
      ) : null}
      <Button
        title={t("merchantRegister.registerMerchant")}
        disabled={invalid}
        loading={mutation.isPending}
        onPress={() =>
          mutation.mutate({
            category_id: category_id!,
            name: name.trim(),
            description: description.trim() || undefined,
            phone: phone.trim(),
            address: address.trim(),
            latitude: latitude!,
            longitude: longitude!,
            image: image!,
          })
        }
      />
      {invalid ? (
        <Text className="text-center text-sm text-muted">
          {t("merchantRegister.requiredFields")}
        </Text>
      ) : null}
    </Screen>
  );
}
