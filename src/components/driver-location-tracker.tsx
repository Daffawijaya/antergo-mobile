import * as Location from 'expo-location';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getDriverProfile, updateDriverLocation } from '@/lib/api/driver-rides';
import { driverKeys } from '@/lib/driver-query-keys';
import { setDriverTrackingMode, startDriverBackgroundTracking, stopDriverLocationTracking } from '@/lib/driver-location-service';
import { coordinateFromLocation, distanceMeters, type Coordinate } from '@/lib/location';
import { useDriverLocationStore } from '@/stores/driver-location-store';

const MIN_DISTANCE_METERS = 25;
const MAX_INTERVAL_MS = 15_000;

export function DriverLocationTracker() {
  const client = useQueryClient();
  const profile = useQuery({ queryKey: driverKeys.profile, queryFn: getDriverProfile });
  const setState = useDriverLocationStore((state) => state.setLocationState);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const sending = useRef(false);
  const lastSent = useRef<{ coordinate: Coordinate; at: number } | undefined>(undefined);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (next) => setForeground(next === 'active'));
    return () => listener.remove();
  }, []);

  useEffect(() => () => {
    subscription.current?.remove();
    subscription.current = null;
    void stopDriverLocationTracking();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const stopForeground = () => {
      subscription.current?.remove();
      subscription.current = null;
      lastSent.current = undefined;
    };

    if (!profile.data?.is_online) {
      stopForeground();
      void stopDriverLocationTracking();
      setState('idle');
      return stopForeground;
    }

    const start = async () => {
      try {
        const [foregroundPermission, backgroundPermission] = await Promise.all([
          Location.getForegroundPermissionsAsync(),
          Location.getBackgroundPermissionsAsync(),
        ]);
        if (!foregroundPermission.granted || !backgroundPermission.granted) {
          stopForeground();
          await stopDriverLocationTracking();
          if (!cancelled) setState('permission_required', 'Permission diperlukan. Tekan Retry Tracking lalu izinkan lokasi sepanjang waktu.');
          return;
        }

        await startDriverBackgroundTracking();
        if (cancelled) return;
        if (!foreground) {
          stopForeground();
          await setDriverTrackingMode('background');
          if (!cancelled) setState('background', 'Background tracking aktif.');
          return;
        }

        await setDriverTrackingMode('foreground');
        setState('foreground', 'Lokasi aktif selama aplikasi terbuka.');
        subscription.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 10_000 },
          async (location) => {
            if (sending.current || cancelled || AppState.currentState !== 'active') return;
            const coordinate = coordinateFromLocation(location);
            const previous = lastSent.current;
            if (previous && Date.now() - previous.at < MAX_INTERVAL_MS && distanceMeters(previous.coordinate, coordinate) < MIN_DISTANCE_METERS) return;
            sending.current = true;
            try {
              await updateDriverLocation(location);
              lastSent.current = { coordinate, at: Date.now() };
              setState('foreground', 'Lokasi aktif.');
              await client.invalidateQueries({ queryKey: ['driver', 'rides', 'detail'] });
            } catch {
              setState('error', 'Tracking gagal mengirim lokasi. Sistem akan mencoba lagi pada pembaruan berikutnya.');
            } finally {
              sending.current = false;
            }
          },
          (reason) => setState('error', reason || 'GPS tidak tersedia untuk pembaruan lokasi.'),
        );
      } catch (error) {
        stopForeground();
        if (!cancelled) setState('error', error instanceof Error ? error.message : 'Tracking gagal dimulai.');
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopForeground();
    };
  }, [client, foreground, profile.data?.is_online, setState]);

  return null;
}
