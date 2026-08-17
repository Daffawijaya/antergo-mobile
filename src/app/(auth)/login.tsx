import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, StyleSheet, Text, View } from "react-native";
import { Button, FormField, Notice, Screen } from "@/components/ui";
import { Elevation, Radius, Spacing, Typography } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { type LoginForm, loginSchema } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useAppTheme } from "@/stores/theme-store";

// Dark logo for light backgrounds, light logo for dark backgrounds.
const LOGOS = {
  light: require("../../../assets/logo/antegolight.png"),
  dark: require("../../../assets/logo/antegodark.png"),
} as const;

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState<string>();
  const { mode, colors } = useAppTheme();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const submit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      await login(values);
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    }
  });
  const linkColor = mode === "dark" ? "#FFB900" : "#92400E";
  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.brand}>
        <Image
          source={LOGOS[mode]}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="AnterGo"
        />
        <Text style={[styles.tagline, { color: colors.muted }]}>
          Semua perjalanan dimulai dari sini.
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.text }]}>
            Selamat datang
          </Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            Masuk untuk melanjutkan ke akunmu.
          </Text>
        </View>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <FormField
              label="Email"
              placeholder="nama@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <FormField
              label="Password"
              placeholder="Masukkan password"
              secureTextEntry
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
          )}
        />
        {serverError ? <Notice tone="danger">{serverError}</Notice> : null}
        <Button
          title="Masuk"
          loading={isSubmitting}
          onPress={submit}
          className="rounded-full"
        />
      </View>
      <Text style={[styles.footer, { color: colors.muted }]}>
        Belum punya akun?{" "}
        <Link href="./register" style={[styles.link, { color: linkColor }]}>
          Daftar sekarang
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "center", paddingTop: Spacing.xxxl },
  brand: { alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.lg },
  logo: { width: 220, height: 46 },
  tagline: { ...Typography.body, textAlign: "center" },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Elevation.card,
  },
  heading: { gap: Spacing.xs, marginBottom: Spacing.xs },
  title: { ...Typography.pageTitle },
  description: { ...Typography.body },
  footer: { textAlign: "center", ...Typography.body },
  link: { fontWeight: "800" },
});
