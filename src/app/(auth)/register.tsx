import { Notice } from "@/components/ui";
import { Colors, Radius, Spacing, Typography } from "@/constants/colors";
import { useTranslation } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api/client";
import { type RegisterForm, registerSchema } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useAppTheme } from "@/stores/theme-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

function RegisterGradientBackground() {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <LinearGradient
          id="registerBackground"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <Stop offset="0%" stopColor="#FFD84F" />
          <Stop offset="28%" stopColor="#FFC247" />
          <Stop offset="58%" stopColor="#FFAD3D" />
          <Stop offset="80%" stopColor="#FF9A3B" />
          <Stop offset="100%" stopColor="#FF7F3F" />
        </LinearGradient>
      </Defs>

      <Rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="url(#registerBackground)"
      />
    </Svg>
  );
}

function RegisterField({
  label,
  error,
  right,
  noBorder,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  right?: ReactNode;
  noBorder?: boolean;
}) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const { onFocus, onBlur, ...rest } = props;

  const borderColor = error
    ? Colors.danger
    : focused
      ? Colors.primary
      : colors.border;

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: "#000000" }]}>{label}</Text>

      <View
        className="flex-row items-center rounded-lg pr-1.5"
        style={{
          borderColor: noBorder ? "transparent" : borderColor,
          backgroundColor: colors.surface,
          borderWidth: noBorder ? 0 : 1,
        }}
      >
        <TextInput
          placeholderTextColor="#9CA3AF"
          className="flex-1 rounded-lg py-0 text-base"
          style={{
            paddingHorizontal: 16,
            color: colors.text,
            backgroundColor: colors.surface,
            minHeight: 50,
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />

        {right}
      </View>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const [serverError, setServerError] = useState<string>();
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const {
    control,
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
    <View style={styles.root}>
      <RegisterGradientBackground />

      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom", "left", "right"]}
      >
        <View style={styles.screen}>
          <View style={styles.container}>
            <View style={styles.brand}>
              <Image
                source={require("../../../assets/logo/antegoblack.png")}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="anterGo"
              />
            </View>

            <Text style={[styles.title, { color: "#000000" }]}>
              {t("auth.registerTitle")}
            </Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <RegisterField
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
                  <RegisterField
                    label="Email"
                    placeholder="nama@email.com"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    onSubmitEditing={submit}
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
                  <RegisterField
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
                  <RegisterField
                    label={t("auth.password")}
                    placeholder={t("auth.createPassword")}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    error={errors.password?.message}
                    noBorder
                  />
                )}
              />

              <Controller
                control={control}
                name="password_confirmation"
                render={({ field }) => (
                  <RegisterField
                    label={t("auth.confirmPassword")}
                    placeholder={t("auth.repeatPassword")}
                    secureTextEntry
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    error={errors.password_confirmation?.message}
                    noBorder
                  />
                )}
              />

              {serverError ? (
                <Notice tone="danger">{serverError}</Notice>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting }}
                disabled={isSubmitting}
                onPress={submit}
                style={({ pressed }) => [
                  styles.submit,
                  pressed && !isSubmitting && styles.submitPressed,
                  isSubmitting && styles.submitDisabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.submitText}>
                    {t("auth.createAccount")}
                  </Text>
                )}
              </Pressable>
            </View>

            <Text style={[styles.footer, { color: "#000000" }]}>
              {t("auth.hasAccount")}{" "}
              <Link
                href="./login"
                style={[styles.link, { color: "#000000" }]}
              >
                {t("auth.login")}
              </Link>
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFB13D",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  brand: {
    alignItems: "center",
    marginBottom: Spacing.xxxl,
  },
  logo: {
    width: 168,
    height: 35,
  },
  title: {
    ...Typography.sectionTitle,
    marginBottom: Spacing.xl + Spacing.sm,
  },
  form: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.metadata,
    fontWeight: "700",
  },
  fieldError: {
    ...Typography.metadata,
    color: Colors.danger,
  },
  submit: {
    minHeight: 52,
    marginTop: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitPressed: {
    backgroundColor: Colors.secondary,
    opacity: 0.8,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    ...Typography.button,
    color: "#FFFFFF",
  },
  footer: {
    marginTop: Spacing.xxxl,
    textAlign: "center",
    ...Typography.body,
  },
  link: {
    fontWeight: "800",
  },
});
