import { Notice } from "@/components/ui";
import { Colors, Radius, Spacing, Typography } from "@/constants/colors";
import { useTranslation } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api/client";
import { loginSchema, type LoginForm } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useAppTheme } from "@/stores/theme-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
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

// Dark logo for light backgrounds, light logo for dark backgrounds.
const LOGOS = {
  light: require("../../../assets/logo/antegolight.png"),
  dark: require("../../../assets/logo/antegodark.png"),
} as const;

function LoginGradientBackground() {
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
          id="loginBackground"
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
        fill="url(#loginBackground)"
      />
    </Svg>
  );
}

function LoginField({
  label,
  error,
  right,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  right?: ReactNode;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: "#000000" }]}>{label}</Text>

      <View
        className="flex-row items-center rounded-lg pr-1.5"
        style={{ backgroundColor: colors.surface }}
      >
        <TextInput
          placeholderTextColor="#9CA3AF"
          className="flex-1 rounded-lg py-0 text-base"
          style={{
            paddingHorizontal: 16,
            color: colors.text,
            minHeight: 50,
          }}
          {...props}
        />

        {right}
      </View>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);

  const [serverError, setServerError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);

  const { mode, colors } = useAppTheme();
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
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
    <View style={styles.root}>
      <LoginGradientBackground />

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
              {t("auth.welcomeBack")}
            </Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <LoginField
                    label={t("auth.email")}
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

              <View style={styles.passwordBlock}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field }) => (
                  <LoginField
                    label={t("auth.password")}
                    placeholder={t("auth.enterPassword")}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    error={errors.password?.message}
                      right={
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            showPassword
                              ? t("auth.hidePassword")
                              : t("auth.showPassword")
                          }
                          onPress={() => setShowPassword((visible) => !visible)}
                          hitSlop={10}
                          style={({ pressed }) => [
                            styles.eye,
                            pressed && styles.eyePressed,
                          ]}
                        >
                          {showPassword ? (
                            <EyeOff size={20} color={colors.muted} />
                          ) : (
                            <Eye size={20} color={colors.muted} />
                          )}
                        </Pressable>
                      }
                    />
                  )}
                />

                <Text
                  style={[styles.forgot, { color: "#000000" }]}
                  accessibilityLabel={t("auth.forgotPassword")}
                >
                  {t("auth.forgotPassword")}
                </Text>
              </View>

              {serverError ? (
                <Notice tone="danger">{serverError}</Notice>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: isSubmitting,
                }}
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
                  <Text style={styles.submitText}>{t("auth.login")}</Text>
                )}
              </Pressable>
            </View>

            <Text style={[styles.footer, { color: "#000000" }]}>
              {t("auth.noAccount")}{" "}
              <Link
                href="./register"
                style={[styles.link, { color: "#000000" }]}
              >
                {t("auth.register")}
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
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    paddingRight: Spacing.sm + 2,
  },
  input: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 0,
    borderRadius: Radius.md,
    ...Typography.body,
  },
  fieldError: {
    ...Typography.metadata,
    color: Colors.danger,
  },
  passwordBlock: {
    gap: Spacing.sm,
  },
  eye: {
    padding: Spacing.xs,
  },
  eyePressed: {
    opacity: 0.6,
  },
  forgot: {
    alignSelf: "flex-end",
    ...Typography.metadata,
    fontWeight: "600",
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
