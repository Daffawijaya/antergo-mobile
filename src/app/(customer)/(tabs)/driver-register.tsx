import { CustomerPageHeader } from "@/components/customer-page";
import { PhotoInput } from "@/components/photo-input";
import { Button, FormField, Notice, Screen } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { applyAsDriver, type VehicleDraft } from "@/lib/api/resources";
import type { OptimizedPhoto } from "@/lib/image-upload";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/i18n";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
type Step = 1 | 2 | 3;
export default function DriverRegisterScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>(1);
  const [nik, setNik] = useState("");
  const [avatar, setAvatar] = useState<OptimizedPhoto>();
  const [ktp, setKtp] = useState<OptimizedPhoto>();
  const [simA, setSimA] = useState<OptimizedPhoto>();
  const [simC, setSimC] = useState<OptimizedPhoto>();
  const [vehicles, setVehicles] = useState<VehicleDraft[]>([]);
  const [type, setType] = useState<"motorcycle" | "car">("motorcycle");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");
  const [vehicleImage, setVehicleImage] = useState<OptimizedPhoto>();
  const [error, setError] = useState("");
  const { t } = useTranslation();
  const goBack = () =>
    returnTo ? router.replace(returnTo as never) : router.back();
  const mutation = useMutation({
    mutationFn: applyAsDriver,
    onSuccess: goBack,
  });
  const addVehicle = () => {
    if (
      !brand.trim() ||
      !model.trim() ||
      !plate.trim() ||
      !color.trim() ||
      !vehicleImage
    ) {
      setError("Lengkapi semua data dan foto kendaraan.");
      return;
    }
    setVehicles((v) => [
      ...v,
      {
        type,
        brand: brand.trim(),
        model: model.trim(),
        plate_number: plate.trim().toUpperCase(),
        color: color.trim(),
        image: vehicleImage,
      },
    ]);
    setBrand("");
    setModel("");
    setPlate("");
    setColor("");
    setVehicleImage(undefined);
    setError("");
  };
  const needsA =
    vehicles.some((v) => v.type === "car") ||
    (type === "car" && !!vehicleImage);
  const needsC =
    vehicles.some((v) => v.type === "motorcycle") ||
    (type === "motorcycle" && !!vehicleImage);
  const submit = () => {
    if (
      !avatar ||
      nik.length !== 16 ||
      !ktp ||
      !vehicles.length ||
      (vehicles.some((v) => v.type === "car") && !simA) ||
      (vehicles.some((v) => v.type === "motorcycle") && !simC)
    ) {
      setError("Lengkapi profil, dokumen, kendaraan, dan SIM yang sesuai.");
      return;
    }
    mutation.mutate({ nik, avatar, ktp, sim_a: simA, sim_c: simC, vehicles });
  };
  return (
    <Screen className="gap-5 px-4 pt-2">
      <CustomerPageHeader
        title={t("driver.register")}
        subtitle={t("driver.stepOf").replace("{step}", String(step))}
        onBack={step === 1 ? goBack : () => setStep((step - 1) as Step)}
      />
      <View className="flex-row gap-2">
        {[1, 2, 3].map((n) => (
          <View
            key={n}
            className={`h-1 flex-1 rounded-full ${n <= step ? "bg-brand" : "bg-surface-muted"}`}
          />
        ))}
      </View>
      {step === 1 ? (
        <View className="gap-5">
          <Text className="font-bold text-xl text-foreground">
            {t("driver.profile")}
          </Text>
          <PhotoInput
            label={t("driver.photo")}
            helper={t("driver.photoHint")}
            kind="avatar"
            value={avatar}
            onChange={setAvatar}
          />
          <View className="gap-1 border-b border-border pb-4">
            <Text className="text-sm text-muted">{t("driver.accountName")}</Text>
            <Text className="text-base text-foreground">{user?.name}</Text>
          </View>
          <View className="gap-1 border-b border-border pb-4">
            <Text className="text-sm text-muted">{t("driver.phoneNumber")}</Text>
            <Text className="text-base text-foreground">{user?.phone}</Text>
          </View>
          <FormField
            label={t("driver.nik")}
            value={nik}
            onChangeText={(v) => setNik(v.replace(/\D/g, "").slice(0, 16))}
            keyboardType="number-pad"
            placeholder={t("driver.nikPlaceholder")}
          />
          <Button
            title={t("driver.nextToDocuments")}
            disabled={!avatar || nik.length !== 16}
            onPress={() => setStep(2)}
          />
        </View>
      ) : null}
      {step === 2 ? (
        <View className="gap-5">
          <Text className="font-bold text-xl text-foreground">{t("driver.documents")}</Text>
          <PhotoInput
            document
            label={t("driver.ktpPhoto")}
            helper={t("driver.ktpHint")}
            kind="document"
            value={ktp}
            onChange={setKtp}
          />
          <Button
            title={t("driver.nextToVehicles")}
            disabled={!ktp}
            onPress={() => setStep(3)}
          />
        </View>
      ) : null}
      {step === 3 ? (
        <View className="gap-5">
          <Text className="font-bold text-xl text-foreground">{t("driver.vehicles")}</Text>
          {vehicles.map((v, i) => (
            <View
              key={`${v.plate_number}-${i}`}
              className="flex-row items-center justify-between border-b border-border pb-3"
            >
              <View>
                <Text className="font-bold text-foreground">
                  {v.type === "car" ? t("driver.car") : t("driver.motorcycle")}
                </Text>
                <Text className="text-muted">
                  {v.brand} {v.model} · {v.plate_number}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  setVehicles((all) => all.filter((_, x) => x !== i))
                }
              >
                <Text className="font-semibold text-red-500">{t("common.delete")}</Text>
              </Pressable>
            </View>
          ))}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                title={t("driver.addMotorcycle")}
                variant={type === "motorcycle" ? "primary" : "secondary"}
                onPress={() => setType("motorcycle")}
              />
            </View>
            <View className="flex-1">
              <Button
                title={t("driver.addCar")}
                variant={type === "car" ? "primary" : "secondary"}
                onPress={() => setType("car")}
              />
            </View>
          </View>
          <FormField label={t("driver.brand")} value={brand} onChangeText={setBrand} />
          <FormField label={t("driver.model")} value={model} onChangeText={setModel} />
          <FormField
            label={t("driver.plateNumber")}
            value={plate}
            onChangeText={setPlate}
            autoCapitalize="characters"
          />
          <FormField label={t("driver.color")} value={color} onChangeText={setColor} />
          <PhotoInput
            label={t("driver.vehiclePhoto")}
            helper={t("driver.vehiclePhotoHint")}
            kind="vehicle"
            value={vehicleImage}
            onChange={setVehicleImage}
          />
          {type === "motorcycle" ? (
            <PhotoInput
              document
              label={t("driver.simCPhoto")}
              helper={t("driver.simCHint")}
              kind="document"
              value={simC}
              onChange={setSimC}
            />
          ) : null}

          {type === "car" ? (
            <PhotoInput
              document
              label={t("driver.simAPhoto")}
              helper={t("driver.simAHint")}
              kind="document"
              value={simA}
              onChange={setSimA}
            />
          ) : null}
          <Button
            variant="secondary"
            title={t("driver.addVehicle")}
            onPress={addVehicle}
          />
          {needsA && !simA ? (
            <Notice tone="info">{t("driver.simARequired")}</Notice>
          ) : null}
          {needsC && !simC ? (
            <Notice tone="info">{t("driver.simCRequired")}</Notice>
          ) : null}
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {mutation.isError ? (
            <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
          ) : null}
          <Button
            title={t("driver.submitRegistration")}
            disabled={!vehicles.length}
            loading={mutation.isPending}
            onPress={submit}
          />
        </View>
      ) : null}
    </Screen>
  );
}
