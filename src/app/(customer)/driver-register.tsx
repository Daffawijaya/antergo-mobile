import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CustomerPageHeader, CustomerPanel } from "@/components/customer-page";
import { Button, FormField, Notice, Screen } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { applyAsDriver } from "@/lib/api/resources";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAppTheme } from "@/stores/theme-store";

export default function DriverRegisterScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { colors } = useAppTheme();
  const goBack = () =>
    returnTo ? router.replace(returnTo as never) : router.back();
  const [nik, setNik] = useState("");
  const [license, setLicense] = useState("");
  const [vehicleType, setVehicleType] = useState<"motorcycle" | "car">(
    "motorcycle",
  );
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");
  const mutation = useMutation({
    mutationFn: applyAsDriver,
    onSuccess: goBack,
  });
  const validation =
    nik.length !== 16
      ? "NIK harus terdiri dari 16 angka."
      : !license.trim()
        ? "Nomor SIM wajib diisi."
        : !brand.trim()
          ? "Merek kendaraan wajib diisi."
          : !plate.trim()
            ? "Nomor polisi wajib diisi."
            : null;
  return (
    <Screen contentStyle={styles.screen}>
      <CustomerPageHeader
        title="Daftar Driver"
        subtitle="Lengkapi data untuk menjadi mitra AnterGo"
        onBack={goBack}
      />
      <Notice tone="info">
        Pastikan NIK, SIM, dan informasi kendaraan sesuai dokumen asli.
      </Notice>
      <CustomerPanel title="Data pendaftaran">
        <FormField
          label="NIK"
          value={nik}
          onChangeText={(value) =>
            setNik(value.replace(/\D/g, "").slice(0, 16))
          }
          keyboardType="number-pad"
          placeholder="16 digit NIK"
        />
        <FormField
          label="Nomor SIM"
          value={license}
          onChangeText={setLicense}
          autoCapitalize="characters"
          placeholder="Nomor SIM A atau C"
        />
        <Text style={[styles.label, { color: colors.text }]}>
          Jenis kendaraan
        </Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              title="Motorcycle"
              variant={vehicleType === "motorcycle" ? "primary" : "secondary"}
              onPress={() => setVehicleType("motorcycle")}
            />
          </View>
          <View style={styles.flex}>
            <Button
              title="Car"
              variant={vehicleType === "car" ? "primary" : "secondary"}
              onPress={() => setVehicleType("car")}
            />
          </View>
        </View>
        <FormField
          label="Merek kendaraan"
          value={brand}
          onChangeText={setBrand}
          placeholder="Contoh: Honda"
        />
        <FormField
          label="Model kendaraan (opsional)"
          value={model}
          onChangeText={setModel}
          placeholder="Contoh: Vario 160"
        />
        <FormField
          label="Nomor polisi"
          value={plate}
          onChangeText={setPlate}
          autoCapitalize="characters"
          placeholder="Contoh: KT 1234 AG"
        />
        <FormField
          label="Warna (opsional)"
          value={color}
          onChangeText={setColor}
          placeholder="Contoh: Hitam"
        />
      </CustomerPanel>
      {mutation.isError ? (
        <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
      ) : null}
      <Button
        title="Kirim Pengajuan"
        disabled={Boolean(validation)}
        loading={mutation.isPending}
        onPress={() =>
          mutation.mutate({
            nik,
            license_number: license.trim(),
            vehicle_type: vehicleType,
            brand: brand.trim(),
            model: model.trim() || undefined,
            plate_number: plate.trim(),
            color: color.trim() || undefined,
          })
        }
      />
      {validation ? <Text style={styles.hint}>{validation}</Text> : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { paddingTop: 7, gap: 12 },
  label: { color: Colors.text, fontSize: 13, fontFamily: "Outfit_700Bold" },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  hint: {
    color: Colors.muted,
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
});
