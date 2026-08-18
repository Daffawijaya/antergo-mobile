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
  addDriverVehicle,
  getDriverProfile,
  selectActiveVehicle,
} from "@/lib/api/resources";
import { driverKeys } from "@/lib/driver-query-keys";
import {
  DOC_LABELS,
  SIM_FOR_VEHICLE,
  vehicleSimExpired,
} from "@/lib/driver-documents";
import type { OptimizedPhoto } from "@/lib/image-upload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import type { VehicleType } from "@/types/api";

export default function VehiclesScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: driverKeys.profile,
    queryFn: getDriverProfile,
  });

  const [show, setShow] = useState(false);
  const [type, setType] = useState<VehicleType>("motorcycle");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");
  const [image, setImage] = useState<OptimizedPhoto>();
  const [sim, setSim] = useState<OptimizedPhoto>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const docs = query.data?.documents ?? [];
  const vehicles = query.data?.vehicles ?? [];

  // Determine which SIM types are valid (uploaded AND not expired)
  const hasValidSimA = useMemo(() => {
    const doc = docs.find((d) => d.type === "sim_a");
    return !!doc && !vehicleSimExpired(docs, "car");
  }, [docs]);

  const hasValidSimC = useMemo(() => {
    const doc = docs.find((d) => d.type === "sim_c");
    return !!doc && !vehicleSimExpired(docs, "motorcycle");
  }, [docs]);

  // Allowed vehicle types based on valid SIMs
  const allowedTypes = useMemo((): VehicleType[] => {
    const types: VehicleType[] = [];
    if (hasValidSimA) types.push("car");
    if (hasValidSimC) types.push("motorcycle");
    return types;
  }, [hasValidSimA, hasValidSimC]);

  const hasAnySim = hasValidSimA || hasValidSimC;

  // Auto-set type when only one option
  const effectiveType = useMemo(() => {
    if (allowedTypes.length === 1) return allowedTypes[0];
    return type;
  }, [allowedTypes, type]);

  // Sync type when allowedTypes change (e.g., after toggle show)
  const effectiveTypeForDisplay =
    allowedTypes.length === 1 ? allowedTypes[0] : type;

  // Check if SIM upload is needed for the selected type
  const needsSim = useMemo(() => {
    if (!hasAnySim) return false;
    const docType = effectiveType === "car" ? "sim_a" : "sim_c";
    return !docs.some((d) => d.type === docType);
  }, [effectiveType, docs, hasAnySim]);

  const refresh = async () =>
    client.invalidateQueries({ queryKey: driverKeys.profile });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!brand.trim()) e.brand = "Merek wajib diisi.";
    if (!model.trim()) e.model = "Model wajib diisi.";
    if (!plate.trim()) e.plate = "Nomor polisi wajib diisi.";
    if (!color.trim()) e.color = "Warna wajib diisi.";
    if (!image) e.image = "Foto kendaraan wajib diunggah.";
    if (needsSim && !sim) e.sim = "Foto SIM wajib diunggah.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const add = useMutation({
    mutationFn: addDriverVehicle,
    onSuccess: async () => {
      setShow(false);
      setImage(undefined);
      setSim(undefined);
      setBrand("");
      setModel("");
      setPlate("");
      setColor("");
      setErrors({});
      await refresh();
    },
  });

  const active = useMutation({
    mutationFn: selectActiveVehicle,
    onSuccess: refresh,
  });

  const handleSubmit = () => {
    if (!validate()) return;
    add.mutate({
      type: effectiveTypeForDisplay,
      brand: brand.trim(),
      model: model.trim(),
      plate_number: plate.trim().toUpperCase(),
      color: color.trim(),
      image: image!,
      sim: needsSim ? sim : undefined,
    });
  };

  const resetForm = () => {
    setShow(false);
    setImage(undefined);
    setSim(undefined);
    setBrand("");
    setModel("");
    setPlate("");
    setColor("");
    setErrors({});
    add.reset();
  };

  return (
    <Screen className="gap-5 px-4 pt-2">
      <BackButton
        onPress={() => router.replace("/(driver)/profile")}
        title="Kendaraan Saya"
      />
      {query.isLoading ? (
        <StatusState type="loading" />
      ) : query.isError ? (
        <StatusState type="error" message={getApiErrorMessage(query.error)} />
      ) : (
        <View className="gap-4">
          {/* Empty state */}
          {!vehicles.length && !show ? (
            <View className="items-center gap-3 py-8">
              <Text className="text-center text-base text-muted">
                Belum ada kendaraan.
              </Text>
              <Text className="text-center text-sm text-muted">
                Tambahkan kendaraan yang akan digunakan untuk menerima
                perjalanan.
              </Text>
            </View>
          ) : null}

          {/* Vehicle list */}
          {vehicles.map((v) => {
            const simExpired = vehicleSimExpired(docs, v.type);
            const simLabel = DOC_LABELS[SIM_FOR_VEHICLE[v.type]];
            return (
              <View key={v.id} className="gap-2 border-b border-border pb-4">
                <View className="flex-row justify-between">
                  <View>
                    <Text className="font-bold text-lg text-foreground">
                      {v.type === "car" ? "Mobil" : "Motor"}
                    </Text>
                    <Text className="text-muted">
                      {v.brand} {v.model}
                    </Text>
                    <Text className="text-muted">
                      {v.plate_number} · {v.color}
                    </Text>
                  </View>
                  {query.data?.active_vehicle_id === v.id ? (
                    <Text className="font-semibold text-brand-dark">
                      Aktif
                    </Text>
                  ) : null}
                </View>
                {simExpired ? (
                  <View className="gap-2">
                    <Notice tone="danger">
                      {simLabel} sudah kedaluwarsa. Perbarui {simLabel} di
                      Dokumen &amp; SIM untuk menggunakan kendaraan ini.
                    </Notice>
                    <Button
                      compact
                      variant="secondary"
                      title={`Perbarui ${simLabel}`}
                      onPress={() => router.push("/(driver)/documents")}
                    />
                  </View>
                ) : query.data?.active_vehicle_id !== v.id ? (
                  <Button
                    compact
                    variant="secondary"
                    title="Gunakan Kendaraan Ini"
                    loading={active.isPending}
                    onPress={() => active.mutate(v.id)}
                  />
                ) : null}
              </View>
            );
          })}

          {/* No valid SIM state */}
          {!hasAnySim && !show ? (
            <Notice tone="info">
              Tambahkan SIM A atau SIM C terlebih dahulu untuk menambahkan
              kendaraan.
            </Notice>
          ) : null}

          {/* Add vehicle CTA / Form */}
          {!hasAnySim && !show ? (
            <Button
              title="Kelola Dokumen"
              variant="secondary"
              onPress={() => router.push("/(driver)/documents")}
            />
          ) : (
            <Button
              title={show ? "Tutup Form" : "+ Tambah Kendaraan"}
              variant="secondary"
              onPress={() => {
                if (show) {
                  resetForm();
                } else {
                  setShow(true);
                  // Auto-set type if only one option
                  if (allowedTypes.length === 1) {
                    setType(allowedTypes[0]);
                  }
                }
              }}
            />
          )}

          {/* Add vehicle form */}
          {show && hasAnySim ? (
            <View className="gap-5 border-t border-border pt-5">
              <Text className="font-bold text-xl text-foreground">
                Kendaraan baru
              </Text>

              {/* Vehicle type selector */}
              {allowedTypes.length > 1 ? (
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      title="Motor"
                      variant={
                        type === "motorcycle" ? "primary" : "secondary"
                      }
                      onPress={() => {
                        setType("motorcycle");
                        setSim(undefined);
                        setErrors((e) => {
                          const { sim: _, ...rest } = e;
                          return rest;
                        });
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      title="Mobil"
                      variant={type === "car" ? "primary" : "secondary"}
                      onPress={() => {
                        setType("car");
                        setSim(undefined);
                        setErrors((e) => {
                          const { sim: _, ...rest } = e;
                          return rest;
                        });
                      }}
                    />
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center gap-2 rounded-xl bg-surface-muted px-4 py-3">
                  <Text className="text-sm text-muted">Jenis Kendaraan</Text>
                  <Text className="font-bold text-base text-foreground">
                    {effectiveTypeForDisplay === "car" ? "Mobil" : "Motor"}
                  </Text>
                </View>
              )}

              {/* Form fields */}
              <FormField
                label="Merek"
                value={brand}
                onChangeText={(v) => {
                  setBrand(v);
                  if (errors.brand) setErrors((e) => ({ ...e, brand: "" }));
                }}
                error={errors.brand || undefined}
              />
              <FormField
                label="Model"
                value={model}
                onChangeText={(v) => {
                  setModel(v);
                  if (errors.model) setErrors((e) => ({ ...e, model: "" }));
                }}
                error={errors.model || undefined}
              />
              <FormField
                label="Nomor Polisi"
                value={plate}
                onChangeText={(v) => {
                  setPlate(v.toUpperCase());
                  if (errors.plate) setErrors((e) => ({ ...e, plate: "" }));
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                error={errors.plate || undefined}
              />
              <FormField
                label="Warna"
                value={color}
                onChangeText={(v) => {
                  setColor(v);
                  if (errors.color) setErrors((e) => ({ ...e, color: "" }));
                }}
                error={errors.color || undefined}
              />

              {/* Vehicle photo */}
              <View>
                <PhotoInput
                  label="Foto Kendaraan"
                  helper="Pastikan kendaraan terlihat jelas dan nomor polisi dapat dibaca."
                  kind="vehicle"
                  value={image}
                  onChange={(v) => {
                    setImage(v);
                    if (errors.image) setErrors((e) => ({ ...e, image: "" }));
                  }}
                />
                {errors.image ? (
                  <Text className="mt-1 font-medium text-[13px] text-danger">
                    {errors.image}
                  </Text>
                ) : null}
              </View>

              {/* SIM upload if needed */}
              {needsSim ? (
                <View>
                  <PhotoInput
                    document
                    label={
                      effectiveTypeForDisplay === "car"
                        ? "Foto SIM A"
                        : "Foto SIM C"
                    }
                    helper="SIM hanya diminta karena belum tersimpan pada profil driver."
                    kind="document"
                    value={sim}
                    onChange={(v) => {
                      setSim(v);
                      if (errors.sim) setErrors((e) => ({ ...e, sim: "" }));
                    }}
                  />
                  {errors.sim ? (
                    <Text className="mt-1 font-medium text-[13px] text-danger">
                      {errors.sim}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Notice tone="info">
                  SIM sesuai kendaraan sudah tersimpan, tidak perlu upload
                  ulang.
                </Notice>
              )}

              {/* Error */}
              {add.isError ? (
                <Notice tone="danger">{getApiErrorMessage(add.error)}</Notice>
              ) : null}

              {/* Submit */}
              <Button
                title="Tambah Kendaraan"
                loading={add.isPending}
                disabled={add.isPending}
                className="rounded-full"
                onPress={handleSubmit}
              />
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
