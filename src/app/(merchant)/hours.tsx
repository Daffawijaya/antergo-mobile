import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import {
  BackButton,
  Button,
  Card,
  Notice,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { getMerchantProfile, setMerchantHours } from "@/lib/api/resources";
import { Colors } from "@/constants/colors";
import { useAppTheme } from "@/stores/theme-store";

const DAYS = [
  { key: "monday", label: "Senin" },
  { key: "tuesday", label: "Selasa" },
  { key: "wednesday", label: "Rabu" },
  { key: "thursday", label: "Kamis" },
  { key: "friday", label: "Jumat" },
  { key: "saturday", label: "Sabtu" },
  { key: "sunday", label: "Minggu" },
] as const;

type DayState = { enabled: boolean; open: string; close: string };
type Hours = Record<string, DayState>;

const fromProfile = (
  hours?: Record<string, { open: string; close: string }> | null,
): Hours =>
  Object.fromEntries(
    DAYS.map(({ key }) => {
      const day = hours?.[key];
      return [key, { enabled: !!day, open: day?.open ?? "08:00", close: day?.close ?? "21:00" }];
    }),
  );

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function MerchantHoursScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const profile = useQuery({
    queryKey: ["merchant", "profile"],
    queryFn: getMerchantProfile,
  });
  const [edited, setEdited] = useState<Hours | null>(null);
  const [validation, setValidation] = useState("");

  // Belum diedit → turunkan langsung dari profil (tanpa efek/sinkronisasi).
  const hours = edited ?? fromProfile(profile.data?.operational_hours);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(
        Object.entries(hours ?? {})
          .filter(([, v]) => v.enabled)
          .map(([k, v]) => [k, { open: v.open.trim(), close: v.close.trim() }]),
      );
      return setMerchantHours({ hours: payload });
    },
    onSuccess: async (merchant) => {
      await Promise.all([
        client.setQueryData(["merchant", "profile"], merchant),
        client.invalidateQueries({ queryKey: ["merchants"] }),
      ]);
      router.back();
    },
  });

  const save = () => {
    if (!hours) return;
    for (const { key, label } of DAYS) {
      if (!hours[key].enabled) continue;
      if (!HH_MM.test(hours[key].open.trim()) || !HH_MM.test(hours[key].close.trim())) {
        setValidation(`Format jam ${label} harus HH:MM (contoh 08:30).`);
        return;
      }
      if (hours[key].open.trim() >= hours[key].close.trim()) {
        setValidation(`Jam buka ${label} harus lebih awal dari jam tutup.`);
        return;
      }
    }
    setValidation("");
    mutation.mutate();
  };

  return (
    <Screen>
      <PageHeader
        eyebrow="Toko"
        title="Jam Operasional"
        description="Atur hari dan jam toko menerima pesanan."
        action={<BackButton onPress={() => router.back()} />}
      />
      {profile.isLoading || !hours ? (
        <StatusState type="loading" />
      ) : profile.isError ? (
        <StatusState
          type="error"
          message={getApiErrorMessage(profile.error)}
          action={<Button title="Coba lagi" onPress={() => profile.refetch()} />}
        />
      ) : (
        <>
          <Text style={styles.hint}>
            Toko hanya dianggap buka pada hari & jam yang diaktifkan. Tombol
            Buka/Tutup manual tetap berlaku sebagai saklar utama.
          </Text>
          {DAYS.map(({ key, label }) => {
            const day = hours[key];
            return (
              <Card key={key}>
                <View style={styles.row}>
                  <Text style={styles.label}>{label}</Text>
                  <Switch
                    value={day.enabled}
                    onValueChange={(enabled) =>
                      setEdited({ ...hours, [key]: { ...day, enabled } })
                    }
                    trackColor={{ true: Colors.primary, false: colors.border }}
                  />
                </View>
                {day.enabled ? (
                  <View style={styles.times}>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Buka</Text>
                      <TextInput
                        style={styles.input}
                        value={day.open}
                        onChangeText={(open) =>
                          setEdited({ ...hours, [key]: { ...day, open } })
                        }
                        placeholder="08:00"
                        placeholderTextColor={colors.muted}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                    <Text style={styles.dash}>–</Text>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Tutup</Text>
                      <TextInput
                        style={styles.input}
                        value={day.close}
                        onChangeText={(close) =>
                          setEdited({ ...hours, [key]: { ...day, close } })
                        }
                        placeholder="21:00"
                        placeholderTextColor={colors.muted}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                  </View>
                ) : (
                  <Text style={styles.closed}>Libur</Text>
                )}
              </Card>
            );
          })}
          {validation ? <Notice tone="danger">{validation}</Notice> : null}
          {mutation.isError ? (
            <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
          ) : null}
          <Button
            title="Simpan Jam Operasional"
            loading={mutation.isPending}
            onPress={save}
          />
        </>
      )}
    </Screen>
  );
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    label: { color: colors.text, fontSize: 16, fontWeight: "700" },
    times: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 12 },
    field: { flex: 1, gap: 4 },
    fieldLabel: { color: colors.muted, fontSize: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    dash: { color: colors.muted, paddingBottom: 10 },
    closed: { color: colors.muted, marginTop: 6 },
  });
