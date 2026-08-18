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
import { useState } from "react";
import { Text, View } from "react-native";
export default function VehiclesScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: driverKeys.profile,
    queryFn: getDriverProfile,
  });
  const [show, setShow] = useState(false);
  const [type, setType] = useState<"motorcycle" | "car">("motorcycle");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");
  const [image, setImage] = useState<OptimizedPhoto>();
  const [sim, setSim] = useState<OptimizedPhoto>();
  const docs = query.data?.documents ?? [];
  const needsSim =
    type === "car"
      ? !docs.some((d) => d.type === "sim_a")
      : !docs.some((d) => d.type === "sim_c");
  const refresh = async () =>
    client.invalidateQueries({ queryKey: driverKeys.profile });
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
      await refresh();
    },
  });
  const active = useMutation({
    mutationFn: selectActiveVehicle,
    onSuccess: refresh,
  });
  const valid =
    brand.trim() &&
    model.trim() &&
    plate.trim() &&
    color.trim() &&
    image &&
    (!needsSim || sim);
  return (
    <Screen className="gap-5 px-4 pt-2">
      <View className="flex-row items-center justify-between">
        <BackButton onPress={() => router.back()} />
        <Text className="font-bold text-lg text-foreground">
          Kendaraan Saya
        </Text>
        <View className="h-10 w-10" />
      </View>
      {query.isLoading ? (
        <StatusState type="loading" />
      ) : query.isError ? (
        <StatusState type="error" message={getApiErrorMessage(query.error)} />
      ) : (
        <View className="gap-4">
          {query.data?.vehicles?.map((v) => {
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
                    <Text className="font-semibold text-brand-dark">Aktif</Text>
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
                      onPress={() => router.push("/(driver)/documents/index")}
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
          <Button
            title={show ? "Tutup Form" : "+ Tambah Kendaraan"}
            variant="secondary"
            onPress={() => setShow((v) => !v)}
          />
        </View>
      )}
      {show ? (
        <View className="gap-5 border-t border-border pt-5">
          <Text className="font-bold text-xl text-foreground">
            Kendaraan baru
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                title="Motor"
                variant={type === "motorcycle" ? "primary" : "secondary"}
                onPress={() => {
                  setType("motorcycle");
                  setSim(undefined);
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
                }}
              />
            </View>
          </View>
          <FormField label="Merek" value={brand} onChangeText={setBrand} />
          <FormField label="Model" value={model} onChangeText={setModel} />
          <FormField
            label="Nomor polisi"
            value={plate}
            onChangeText={setPlate}
          />
          <FormField label="Warna" value={color} onChangeText={setColor} />
          <PhotoInput
            label="Foto Kendaraan"
            helper="Pastikan kendaraan terlihat jelas dan nomor polisi dapat dibaca."
            kind="vehicle"
            value={image}
            onChange={setImage}
          />
          {needsSim ? (
            <PhotoInput
              document
              label={type === "car" ? "Foto SIM A" : "Foto SIM C"}
              helper="SIM hanya diminta karena belum tersimpan pada profil driver."
              kind="document"
              value={sim}
              onChange={setSim}
            />
          ) : (
            <Notice tone="info">
              SIM sesuai kendaraan sudah tersimpan, tidak perlu upload ulang.
            </Notice>
          )}
          {add.isError ? (
            <Notice tone="danger">{getApiErrorMessage(add.error)}</Notice>
          ) : null}
          <Button
            title="Simpan Kendaraan"
            disabled={!valid}
            loading={add.isPending}
            onPress={() =>
              add.mutate({
                type,
                brand: brand.trim(),
                model: model.trim(),
                plate_number: plate.trim(),
                color: color.trim(),
                image: image!,
                sim: needsSim ? sim : undefined,
              })
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}
