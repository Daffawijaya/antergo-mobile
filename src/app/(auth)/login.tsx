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
import { Notice, Screen } from "@/components/ui";
import { Colors, Radius, Spacing, Typography } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { type LoginForm, loginSchema } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useAppTheme } from "@/stores/theme-store";

// Dark logo for light backgrounds, light logo for dark backgrounds.
const LOGOS = {
  light: require("../../../assets/logo/antegolight.png"),
  dark: require("../../../assets/logo/antegodark.png"),
} as const;

function LoginField({
  label,
  error,
  right,
  ...props
}: TextInputProps & { label: string; error?: string; right?: ReactNode }) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const { onFocus, onBlur, ...rest } = props;
  const borderColor = error ? Colors.danger : focused ? Colors.primary : colors.border;
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          { borderColor, backgroundColor: colors.surface },
        ]}
      >
        <TextInput
          placeholderTextColor="#9CA3AF"
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.surface },
          ]}
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

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
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
  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <Image
            source={LOGOS[mode]}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="AnterGo"
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Selamat datang kembali
        </Text>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <LoginField
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
          <View style={styles.passwordBlock}>
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <LoginField
                  label="Password"
                  placeholder="Masukkan password"
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
                          ? "Sembunyikan password"
                          : "Tampilkan password"
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
            {/* Placeholder — alur lupa password belum tersedia. */}
            <Text
              style={[styles.forgot, { color: Colors.primary }]}
              accessibilityLabel="Lupa password? Segera hadir"
            >
              Lupa password?
            </Text>
          </View>

          {serverError ? <Notice tone="danger">{serverError}</Notice> : null}

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
              <Text style={styles.submitText}>Masuk</Text>
            )}
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: colors.muted }]}>
          Belum punya akun?{" "}
          <Link href="./register" style={[styles.link, { color: Colors.primary }]}>
            Daftar
          </Link>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
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
  logo: { width: 168, height: 35 },
  title: {
    ...Typography.sectionTitle,
    marginBottom: Spacing.xl + Spacing.sm,
  },
  form: {
    gap: Spacing.lg,
  },
  field: { gap: Spacing.sm },
  fieldLabel: {
    ...Typography.metadata,
    fontWeight: "700",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
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
  eyePressed: { opacity: 0.6 },
  forgot: {
    alignSelf: "flex-end",
    ...Typography.metadata,
    fontWeight: "600",
  },
  submit: {
    minHeight: 52,
    marginTop: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitPressed: { backgroundColor: Colors.primaryPressed },
  submitDisabled: { opacity: 0.5 },
  submitText: { ...Typography.button, color: "#FFFFFF" },
  footer: {
    marginTop: Spacing.xxxl,
    textAlign: "center",
    ...Typography.body,
  },
  link: { fontWeight: "800" },
});
