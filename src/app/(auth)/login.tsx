import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { Button, Card, FormField, Notice, Screen } from "@/components/ui";
import { Colors, Radius, Spacing, Typography } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { type LoginForm, loginSchema } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState<string>();
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
  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <SymbolView
            name={{ ios: "location.fill", android: "near_me", web: "near_me" }}
            size={34}
            tintColor={Colors.white}
          />
        </View>
        <Text style={styles.brandName}>AnterGo</Text>
        <Text style={styles.tagline}>Semua perjalanan dimulai dari sini.</Text>
      </View>
      <Card style={styles.card}>
        <View style={styles.heading}>
          <Text style={styles.title}>Selamat datang</Text>
          <Text style={styles.description}>
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
        <Button title="Masuk" loading={isSubmitting} onPress={submit} />
      </Card>
      <Text style={styles.footer}>
        Belum punya akun?{" "}
        <Link href="./register" style={styles.link}>
          Daftar sekarang
        </Link>
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { justifyContent: "center", paddingTop: Spacing.xxxl },
  brand: { alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md },
  logo: {
    width: 70,
    height: 70,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  brandName: { color: Colors.text, ...Typography.display },
  tagline: { color: Colors.muted, ...Typography.body },
  card: { gap: Spacing.lg },
  heading: { gap: Spacing.xs, marginBottom: Spacing.xs },
  title: { color: Colors.text, ...Typography.pageTitle },
  description: { color: Colors.muted, ...Typography.body },
  footer: { textAlign: "center", color: Colors.muted, ...Typography.body },
  link: { color: Colors.primaryDark, fontWeight: "800" },
});
