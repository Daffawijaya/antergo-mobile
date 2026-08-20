import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import {
  Button,
  Card,
  FormField,
  Notice,
  PageHeader,
  Screen,
} from "@/components/ui";
import { Colors, Spacing, Typography } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { type RegisterForm, registerSchema } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/i18n";
export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const [serverError, setServerError] = useState<string>();  const { t } = useTranslation();
  const { control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      password_confirmation: "",
    },
  });
  const submit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      await register(values);
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    }
  });
  return (
    <Screen>
      <PageHeader
        eyebrow={t("auth.newAccount")}
        title={t("auth.registerTitle")}
        description={t("auth.registerDesc")}
      />
      <Card>
        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <FormField
                label={t("auth.fullName")}
                placeholder={t("auth.namePlaceholder")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={errors.name?.message}
              />
            )}
          />
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
            name="phone"
            render={({ field }) => (
              <FormField
                label={t("auth.phone")}
                placeholder="08xxxxxxxxxx"
                keyboardType="phone-pad"
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={errors.phone?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FormField
                label={t("auth.password")}
                placeholder={t("auth.createPassword")}
                secureTextEntry
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={errors.password?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password_confirmation"
            render={({ field }) => (
              <FormField
                label={t("auth.confirmPassword")}
                placeholder={t("auth.repeatPassword")}
                secureTextEntry
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={errors.password_confirmation?.message}
              />
            )}
          />
          {serverError ? <Notice tone="danger">{serverError}</Notice> : null}
          <Button title={t("auth.createAccount")} loading={isSubmitting} onPress={submit} />
        </View>
      </Card>
      <Text style={styles.footer}>
        {t("auth.hasAccount")}{" "}
        <Link href="./login" style={styles.link}>
          {t("auth.login")}
        </Link>
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
  footer: { textAlign: "center", color: Colors.muted, ...Typography.body },
  link: { color: Colors.primaryDark, fontWeight: "800" },
});
