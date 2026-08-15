import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { LocationRouteCard } from "@/components/location-field";
import { CustomerPageHeader } from "@/components/customer-page";
import {
  Button,
  FormField,
  Notice,
  Screen,
  SectionHeader,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { createSend } from "@/lib/api/send";
import { orderKeys } from "@/lib/query-keys";
import { createSendSchema, type CreateSendForm } from "@/schemas/send";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import type { ApiErrorPayload } from "@/types/api";
const defaults: CreateSendForm = {
  pickup_address: "",
  pickup_latitude: "",
  pickup_longitude: "",
  destination_address: "",
  destination_latitude: "",
  destination_longitude: "",
  item_name: "",
  item_description: "",
  recipient_name: "",
  recipient_phone: "",
  notes: "",
};
export default function CreateSendScreen() {
  const router = useRouter();
  const [vehicleType, setVehicleType] = useState<"motorcycle" | "car">(
    "motorcycle",
  );
  const client = useQueryClient();
  const pickup = useLocationPickerStore((s) => s.selections["send-pickup"]);
  const destination = useLocationPickerStore(
    (s) => s.selections["send-destination"],
  );
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CreateSendForm>({
    resolver: zodResolver(createSendSchema),
    defaultValues: defaults,
  });
  useEffect(() => {
    if (pickup) {
      setValue("pickup_address", pickup.address, { shouldValidate: true });
      setValue("pickup_latitude", String(pickup.coordinate.latitude), {
        shouldValidate: true,
      });
      setValue("pickup_longitude", String(pickup.coordinate.longitude), {
        shouldValidate: true,
      });
    }
  }, [pickup, setValue]);
  useEffect(() => {
    if (destination) {
      setValue("destination_address", destination.address, {
        shouldValidate: true,
      });
      setValue(
        "destination_latitude",
        String(destination.coordinate.latitude),
        { shouldValidate: true },
      );
      setValue(
        "destination_longitude",
        String(destination.coordinate.longitude),
        { shouldValidate: true },
      );
    }
  }, [destination, setValue]);
  const mutation = useMutation({
    mutationFn: createSend,
    onSuccess: async ({ order }) => {
      await client.invalidateQueries({ queryKey: orderKeys.all });
      router.replace({
        pathname: "/(customer)/send/[id]",
        params: { id: String(order.id) },
      });
    },
  });
  const submit = handleSubmit((value) =>
    mutation.mutate(
      {
        pickup_address: value.pickup_address.trim(),
        pickup_latitude: Number(value.pickup_latitude),
        pickup_longitude: Number(value.pickup_longitude),
        destination_address: value.destination_address.trim(),
        destination_latitude: Number(value.destination_latitude),
        destination_longitude: Number(value.destination_longitude),
        item_name: value.item_name.trim(),
        item_description: value.item_description?.trim() || null,
        recipient_name: value.recipient_name.trim(),
        recipient_phone: value.recipient_phone.trim(),
        notes: value.notes?.trim() || null,
        payment_method: "cash",
        vehicle_type: vehicleType,
      },
      {
        onError: (error) => {
          if (!isAxiosError<ApiErrorPayload>(error)) return;
          Object.entries(error.response?.data?.errors ?? {}).forEach(
            ([field, messages]) => {
              if (field in defaults)
                setError(field as keyof CreateSendForm, {
                  type: "server",
                  message: messages[0],
                });
            },
          );
        },
      },
    ),
  );
  const openPicker = (purpose: "send-pickup" | "send-destination") =>
    router.push({
      pathname: "/(customer)/location-search" as never,
      params: { purpose, returnTo: "/(customer)/send/create" },
    });
  const locationError =
    errors.pickup_address?.message ||
    errors.pickup_latitude?.message ||
    errors.destination_address?.message ||
    errors.destination_latitude?.message;
  return (
    <Screen className="gap-4 bg-background">
      <CustomerPageHeader
        title="Delivery"
        subtitle="Isi tujuan, kendaraan, dan data penerima"
        onBack={() => router.back()}
      />
      <LocationRouteCard
        pickup={{
          label: "Dari mana?",
          value: pickup?.address,
          placeholder: "Pilih lokasi pengambilan",
          onPress: () => openPicker("send-pickup"),
        }}
        destination={{
          label: "Kirim ke mana?",
          value: destination?.address,
          placeholder: "Pilih lokasi penerima",
          onPress: () => openPicker("send-destination"),
        }}
      />
      <View className="gap-3">
        <SectionHeader title="Pilih kendaraan" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              title="Motor"
              variant={vehicleType === "motorcycle" ? "primary" : "secondary"}
              onPress={() => setVehicleType("motorcycle")}
            />
          </View>
          <View className="flex-1">
            <Button
              title="Mobil"
              variant={vehicleType === "car" ? "primary" : "secondary"}
              onPress={() => setVehicleType("car")}
            />
          </View>
        </View>
      </View>
      {locationError ? <Notice tone="danger">{locationError}</Notice> : null}
      <View className="gap-3">
        <SectionHeader title="Barang" />
        <Controller
          control={control}
          name="item_name"
          render={({ field }) => (
            <FormField
              label="Nama barang"
              placeholder="Contoh: Dokumen"
              returnKeyType="next"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.item_name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="item_description"
          render={({ field }) => (
            <FormField
              label="Detail barang (opsional)"
              placeholder="Ukuran, warna, atau ciri barang"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.item_description?.message}
            />
          )}
        />
      </View>
      <View className="gap-3">
        <SectionHeader title="Penerima" />
        <Controller
          control={control}
          name="recipient_name"
          render={({ field }) => (
            <FormField
              label="Nama penerima"
              returnKeyType="next"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.recipient_name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="recipient_phone"
          render={({ field }) => (
            <FormField
              label="Nomor HP penerima"
              keyboardType="phone-pad"
              returnKeyType="done"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.recipient_phone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <FormField
              label="Catatan untuk driver (opsional)"
              multiline
              numberOfLines={3}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.notes?.message}
            />
          )}
        />
      </View>
      {mutation.isError ? (
        <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
      ) : null}
      <Text className="pt-2 text-center text-[13px] text-muted">
        Biaya pengiriman dihitung otomatis berdasarkan jarak.
      </Text>
      <Button
        title="Cari Driver"
        loading={mutation.isPending}
        onPress={submit}
      />
    </Screen>
  );
}
