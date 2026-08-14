import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { RideMap } from '../../../components/ride-map';
import { Button, FormField, PageHeader, Screen } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { createRide } from '@/lib/api/rides';
import { getApiErrorMessage } from '@/lib/api/client';
import { coordinateFromLocation, coordinateLabel, LocationPermissionError, LocationUnavailableError, parseCoordinate, requestCurrentLocation, reverseGeocodeLabel, type Coordinate } from '@/lib/location';
import { orderKeys } from '@/lib/query-keys';
import { createRideSchema, type CreateRideForm } from '@/schemas/ride';
import type { ApiErrorPayload } from '@/types/api';

const defaults: CreateRideForm = { pickup_address: '', pickup_latitude: '', pickup_longitude: '', destination_address: '', destination_latitude: '', destination_longitude: '', notes: '' };
type PointKind = 'pickup' | 'destination';

export default function CreateRideScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<PointKind>('pickup');
  const [locationState, setLocationState] = useState<{ status: 'idle' | 'requesting' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'error' | 'geocoding'; message?: string }>({ status: 'idle' });
  const { control, handleSubmit, setError, setValue, formState: { errors } } = useForm<CreateRideForm>({ resolver: zodResolver(createRideSchema), defaultValues: defaults });
  const [pickupLatitude, pickupLongitude, destinationLatitude, destinationLongitude] = useWatch({ control, name: ['pickup_latitude', 'pickup_longitude', 'destination_latitude', 'destination_longitude'] });
  const pickup = parseCoordinate(pickupLatitude, pickupLongitude);
  const destination = parseCoordinate(destinationLatitude, destinationLongitude);
  const mutation = useMutation({ mutationFn: createRide, onSuccess: async ({ order }) => { await queryClient.invalidateQueries({ queryKey: orderKeys.all }); router.replace({ pathname: '/(customer)/ride/[id]', params: { id: String(order.id) } }); } });

  const setPoint = async (kind: PointKind, coordinate: Coordinate) => {
    const prefix = kind === 'pickup' ? 'pickup' : 'destination';
    setValue(`${prefix}_latitude`, String(coordinate.latitude), { shouldValidate: true });
    setValue(`${prefix}_longitude`, String(coordinate.longitude), { shouldValidate: true });
    setValue(`${prefix}_address`, coordinateLabel(coordinate), { shouldValidate: true });
    setLocationState({ status: 'geocoding', message: `Mencari alamat ${kind === 'pickup' ? 'jemput' : 'tujuan'}…` });
    const label = await reverseGeocodeLabel(coordinate);
    setValue(`${prefix}_address`, label, { shouldValidate: true });
    setLocationState({ status: 'ready', message: 'Titik berhasil dipilih. Marker dapat digeser untuk penyesuaian.' });
  };

  const useMyLocation = async () => {
    try {
      setLocationState({ status: 'requesting', message: 'Meminta izin lokasi foreground…' });
      const location = await requestCurrentLocation();
      setLocationState({ status: 'locating', message: 'Lokasi ditemukan. Mencari alamat…' });
      await setPoint('pickup', coordinateFromLocation(location));
      setSelection('destination');
    } catch (error) {
      if (error instanceof LocationPermissionError) setLocationState({ status: 'denied', message: error.message });
      else if (error instanceof LocationUnavailableError) setLocationState({ status: 'unavailable', message: error.message });
      else setLocationState({ status: 'error', message: error instanceof Error ? error.message : 'Lokasi tidak tersedia.' });
    }
  };

  const submit = handleSubmit((values) => {
    mutation.reset();
    mutation.mutate({ pickup_address: values.pickup_address.trim(), pickup_latitude: Number(values.pickup_latitude), pickup_longitude: Number(values.pickup_longitude), destination_address: values.destination_address.trim(), destination_latitude: Number(values.destination_latitude), destination_longitude: Number(values.destination_longitude), notes: values.notes.trim() || null }, { onError: (error) => { if (!isAxiosError<ApiErrorPayload>(error)) return; Object.entries(error.response?.data?.errors ?? {}).forEach(([field, messages]) => { if (field in defaults) setError(field as keyof CreateRideForm, { type: 'server', message: messages[0] }); }); } });
  });

  return <Screen>
    <Button title="Kembali" variant="secondary" onPress={() => router.back()} />
    <PageHeader eyebrow="Customer Ride" title="Pilih titik perjalanan" description="Gunakan GPS untuk pickup, lalu tap peta untuk memilih tujuan. Harga tetap dihitung backend." />
    <View style={styles.actions}><View style={styles.action}><Button title="Gunakan lokasi saya" loading={locationState.status === 'requesting' || locationState.status === 'locating'} onPress={useMyLocation} /></View></View>
    <View style={styles.actions}><View style={styles.action}><Button title="Pilih Pickup" variant={selection === 'pickup' ? 'primary' : 'secondary'} onPress={() => setSelection('pickup')} /></View><View style={styles.action}><Button title="Pilih Tujuan" variant={selection === 'destination' ? 'primary' : 'secondary'} onPress={() => setSelection('destination')} /></View></View>
    <Text style={styles.hint}>Mode aktif: {selection === 'pickup' ? 'Pickup' : 'Tujuan'}. Tap peta atau geser marker.</Text>
    <RideMap pickup={pickup} destination={destination} showsUserLocation={locationState.status === 'ready'} onMapPress={(coordinate) => void setPoint(selection, coordinate)} onPickupChange={(coordinate) => void setPoint('pickup', coordinate)} onDestinationChange={(coordinate) => void setPoint('destination', coordinate)} />
    {locationState.message ? <Text style={(locationState.status === 'denied' || locationState.status === 'unavailable' || locationState.status === 'error') ? styles.error : styles.hint}>{locationState.message}</Text> : null}
    {(errors.pickup_latitude || errors.pickup_longitude || errors.destination_latitude || errors.destination_longitude) ? <Text style={styles.error}>{errors.pickup_latitude?.message || errors.pickup_longitude?.message || errors.destination_latitude?.message || errors.destination_longitude?.message}</Text> : null}
    <View style={styles.section}><Text style={styles.sectionTitle}>Alamat</Text><Controller control={control} name="pickup_address" render={({ field }) => <FormField label="Alamat jemput" placeholder="Terisi dari GPS/map, dapat diedit" value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors.pickup_address?.message} />} /><Controller control={control} name="destination_address" render={({ field }) => <FormField label="Alamat tujuan" placeholder="Terisi dari map, dapat diedit" value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors.destination_address?.message} />} /><Controller control={control} name="notes" render={({ field }) => <FormField label="Catatan (opsional)" placeholder="Patokan atau instruksi untuk driver" multiline numberOfLines={3} textAlignVertical="top" value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors.notes?.message} />} /></View>
    {Platform.OS === 'web' ? <View style={styles.section}><Text style={styles.sectionTitle}>Development fallback: koordinat</Text><Controller control={control} name="pickup_latitude" render={({ field }) => <FormField label="Latitude jemput" keyboardType="numbers-and-punctuation" value={field.value} onChangeText={field.onChange} error={errors.pickup_latitude?.message} />} /><Controller control={control} name="pickup_longitude" render={({ field }) => <FormField label="Longitude jemput" keyboardType="numbers-and-punctuation" value={field.value} onChangeText={field.onChange} error={errors.pickup_longitude?.message} />} /><Controller control={control} name="destination_latitude" render={({ field }) => <FormField label="Latitude tujuan" keyboardType="numbers-and-punctuation" value={field.value} onChangeText={field.onChange} error={errors.destination_latitude?.message} />} /><Controller control={control} name="destination_longitude" render={({ field }) => <FormField label="Longitude tujuan" keyboardType="numbers-and-punctuation" value={field.value} onChangeText={field.onChange} error={errors.destination_longitude?.message} />} /></View> : null}
    {mutation.isError ? <Text style={styles.error}>{getApiErrorMessage(mutation.error)}</Text> : null}<Button title="Pesan Ride" loading={mutation.isPending} onPress={submit} />
  </Screen>;
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: 10 }, action: { flex: 1 }, section: { gap: 14 }, sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' }, hint: { color: Colors.muted, lineHeight: 20 }, error: { color: Colors.danger, lineHeight: 20 } });
