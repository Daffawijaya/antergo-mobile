import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import type { Coordinate } from "@/lib/location";

type Props = {
  pickup?: Coordinate;
  destination?: Coordinate;
  driver?: Coordinate;
};
export function RideMap({ pickup, destination, driver }: Props) {
  return (
    <View style={styles.frame}>
      <Text style={styles.title}>Map tersedia di Android/iOS</Text>
      <Text style={styles.text}>
        Web menggunakan input koordinat development.
      </Text>
      {pickup ? (
        <Text style={styles.text}>
          Pickup: {pickup.latitude.toFixed(6)}, {pickup.longitude.toFixed(6)}
        </Text>
      ) : null}
      {destination ? (
        <Text style={styles.text}>
          Tujuan: {destination.latitude.toFixed(6)},{" "}
          {destination.longitude.toFixed(6)}
        </Text>
      ) : null}
      {driver ? (
        <Text style={styles.text}>
          Driver: {driver.latitude.toFixed(6)}, {driver.longitude.toFixed(6)}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  frame: {
    minHeight: 180,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primarySoft,
  },
  title: { color: Colors.text, fontWeight: "800" },
  text: { color: Colors.muted, textAlign: "center" },
});
