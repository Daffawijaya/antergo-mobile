import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { LocationRouteCard } from "@/components/location-field";
import { CustomerPageHeader } from "@/components/customer-page";
import { Button, FormField, Notice, Screen } from "@/components/ui";
import { createRide } from "@/lib/api/rides";
import { getApiErrorMessage } from "@/lib/api/client";
import { orderKeys } from "@/lib/query-keys";
import { createRideSchema, type CreateRideForm } from "@/schemas/ride";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import type { ApiErrorPayload } from "@/types/api";
const defaults: CreateRideForm = {
  pickup_address: "",
  pickup_latitude: "",
  pickup_longitude: "",
  destination_address: "",
  destination_latitude: "",
  destination_longitude: "",
  notes: "",
};
export default function CreateRideScreen() {
  const router = useRouter();
  const { service } = useLocalSearchParams<{ service?: string }>();
  const serviceType = service === "car" ? "car" : "bike";
  const serviceLabel = serviceType === "car" ? "Car" : "Bike";
  const queryClient = useQueryClient();
  const pickup = useLocationPickerStore((s) => s.selections["ride-pickup"]);
  const destination = useLocationPickerStore(
    (s) => s.selections["ride-destination"],
  );
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CreateRideForm>({
    resolver: zodResolver(createRideSchema),
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
    mutationFn: createRide,
    onSuccess: async ({ order }) => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      router.replace({
        pathname: "/(customer)/ride/[id]",
        params: { id: String(order.id) },
      });
    },
  });
  const submit = handleSubmit((values) =>
    mutation.mutate(
      {
        pickup_address: values.pickup_address.trim(),
        pickup_latitude: Number(values.pickup_latitude),
        pickup_longitude: Number(values.pickup_longitude),
        destination_address: values.destination_address.trim(),
        destination_latitude: Number(values.destination_latitude),
        destination_longitude: Number(values.destination_longitude),
        notes: values.notes.trim() || null,
        service_type: serviceType,
      },
      {
        onError: (error) => {
          if (!isAxiosError<ApiErrorPayload>(error)) return;
          Object.entries(error.response?.data?.errors ?? {}).forEach(
            ([field, messages]) => {
              if (field in defaults)
                setError(field as keyof CreateRideForm, {
                  type: "server",
                  message: messages[0],
                });
            },
          );
        },
      },
    ),
  );
  const openPicker = (purpose: "ride-pickup" | "ride-destination") =>
    router.push({
      pathname: "/(customer)/location-search" as never,
      params: {
        purpose,
        returnTo: `/(customer)/ride/create?service=${service}`,
      },
    });
  const locationError =
    errors.pickup_address?.message ||
    errors.pickup_latitude?.message ||
    errors.destination_address?.message ||
    errors.destination_latitude?.message;
  return (
    <Screen className="gap-3 bg-background">
      <CustomerPageHeader
        title={`Pesan ${serviceLabel}`}
        subtitle="Pilih lokasi jemput dan tujuan perjalananmu"
        onBack={() => router.back()}
      />
      <LocationRouteCard
        pickup={{
          label: "Lokasi jemput",
          value: pickup?.address,
          placeholder: "Pilih lokasi jemput",
          onPress: () => openPicker("ride-pickup"),
        }}
        destination={{
          label: "Tujuan",
          value: destination?.address,
          placeholder: "Mau ke mana?",
          onPress: () => openPicker("ride-destination"),
        }}
      />
      <View className="gap-3">
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <FormField
              label="Catatan untuk driver (opsional)"
              placeholder="Contoh: tunggu di depan lobi"
              multiline
              numberOfLines={3}
              returnKeyType="done"
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              error={errors.notes?.message}
            />
          )}
        />
      </View>
      {locationError ? <Notice tone="danger">{locationError}</Notice> : null}
      {mutation.isError ? (
        <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
      ) : null}
      <Text className="mt-auto pt-2 text-center text-[13px] text-muted">
        Harga dihitung otomatis berdasarkan jarak perjalanan.
      </Text>
      <Button
        title={`Pesan ${serviceLabel}`}
        loading={mutation.isPending}
        onPress={submit}
      />
    </Screen>
  );
}
