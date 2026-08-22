import { Colors } from "@/constants/colors";
import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

type CardBgProps = ViewProps & {
  children: React.ReactNode;
};

/** Purple background card – no border, for the balance/saldo section. */
export function BalanceCardBg({ children, style, ...rest }: CardBgProps) {
  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: Colors.secondary },
        style,
      ]}
      {...rest}
    >
      {/* Background Gelombang */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.waveMiddle} />
        <View style={styles.waveRight} />
      </View>

      {/* Konten Utama */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/** Yellow brand background card – for the top-up section. */
export function TopupCardBg({ children, style, ...rest }: CardBgProps) {
  return (
    <View
      style={[styles.cardContainer, { backgroundColor: Colors.primary }, style]}
      {...rest}
    >
      {/* Background Gelombang */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.waveMiddle} />
        <View style={styles.waveRight} />
      </View>

      {/* Konten Utama */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    minHeight: 66,
    overflow: "hidden",
    position: "relative",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    flex: 1,
  },
  waveMiddle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    top: -120,
    right: -20,
  },
  waveRight: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    bottom: -100,
    right: -50,
  },
});
