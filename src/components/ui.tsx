import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type ViewStyle,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import {
  Colors,
  Elevation,
  Radius,
  Spacing,
  Typography,
} from "@/constants/colors";

export function Screen({
  children,
  scroll = true,
  contentStyle,
}: PropsWithChildren<{ scroll?: boolean; contentStyle?: ViewStyle }>) {
  const content = (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.header}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Card({
  children,
  muted = false,
  style,
}: PropsWithChildren<{ muted?: boolean; style?: ViewStyle }>) {
  return (
    <View style={[styles.card, muted && styles.cardMuted, style]}>
      {children}
    </View>
  );
}

export function FormField({
  label,
  error,
  style,
  multiline,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Colors.subtle}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          error && styles.inputError,
          style,
        ]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  variant = "primary",
  disabled,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  compact?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        styles[`${variant}Button`],
        inactive && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary"
              ? Colors.white
              : variant === "danger"
                ? Colors.danger
                : Colors.primary
          }
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" && styles.secondaryButtonText,
            variant === "danger" && styles.dangerText,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Kembali"
      onPress={onPress}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
    >
      <SymbolView
        name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
        size={20}
        tintColor={Colors.text}
      />
    </Pressable>
  );
}

export function StatusState({
  type,
  title,
  message,
  action,
}: {
  type: "loading" | "empty" | "error";
  title?: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.state}>
      {type === "loading" ? (
        <ActivityIndicator color={Colors.primary} size="large" />
      ) : (
        <View
          style={[styles.stateIcon, type === "error" && styles.stateIconError]}
        >
          {type === "error" ? (
            <SymbolView
              name={{
                ios: "exclamationmark.triangle.fill",
                android: "error",
                web: "error",
              }}
              size={26}
              tintColor={Colors.danger}
            />
          ) : (
            <SymbolView
              name={{ ios: "tray.fill", android: "inbox", web: "inbox" }}
              size={26}
              tintColor={Colors.primary}
            />
          )}
        </View>
      )}
      <Text style={styles.stateTitle}>
        {title ??
          (type === "loading"
            ? "Memuat…"
            : type === "empty"
              ? "Belum ada data"
              : "Terjadi kesalahan")}
      </Text>
      {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

export function KeyValue({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.keyValue}>
      <Text style={styles.keyLabel}>{label}</Text>
      <Text style={styles.keyValueText}>{value}</Text>
    </View>
  );
}

export function Notice({
  children,
  tone = "info",
}: PropsWithChildren<{ tone?: "info" | "warning" | "danger" | "success" }>) {
  return (
    <View style={[styles.notice, styles[`${tone}Notice`]]}>
      <Text style={[styles.noticeText, styles[`${tone}NoticeText`]]}>
        {children}
      </Text>
    </View>
  );
}

export const uiStyles = StyleSheet.create({
  sectionTitle: { color: Colors.text, ...Typography.sectionTitle },
  row: { flexDirection: "row", gap: Spacing.md },
  gap: { gap: Spacing.md },
  muted: { color: Colors.muted, ...Typography.body },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primarySoft,
    color: Colors.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    ...Typography.caption,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingBottom: 24 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  header: { flex: 1, gap: Spacing.xs, paddingVertical: Spacing.sm },
  eyebrow: {
    color: Colors.primaryDark,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  title: { color: Colors.text, ...Typography.pageTitle },
  description: { color: Colors.muted, ...Typography.body },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  sectionTitle: { color: Colors.text, ...Typography.sectionTitle },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Elevation.card,
  },
  cardMuted: {
    backgroundColor: Colors.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  field: { gap: 7 },
  label: { color: Colors.text, ...Typography.metadata, fontWeight: "700" },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 15,
    color: Colors.text,
    fontSize: 16,
  },
  multiline: { minHeight: 92, paddingTop: 14, textAlignVertical: "top" },
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSoft,
  },
  errorText: { color: Colors.danger, ...Typography.metadata },
  button: {
    minHeight: 52,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: 14 },
  primaryButton: { backgroundColor: Colors.primary },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  dangerButton: {
    backgroundColor: Colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  buttonText: { color: Colors.white, ...Typography.button },
  secondaryButtonText: { color: Colors.text },
  dangerText: { color: Colors.danger },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Elevation.card,
  },
  state: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xxl,
    gap: Spacing.sm,
  },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  stateIconError: { backgroundColor: Colors.dangerSoft },
  stateTitle: {
    color: Colors.text,
    ...Typography.cardTitle,
    textAlign: "center",
  },
  stateMessage: {
    color: Colors.muted,
    ...Typography.body,
    textAlign: "center",
  },
  stateAction: { minWidth: 160, marginTop: Spacing.md },
  keyValue: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.lg,
    paddingVertical: 2,
  },
  keyLabel: { color: Colors.muted, ...Typography.metadata },
  keyValueText: {
    color: Colors.text,
    ...Typography.metadata,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  notice: { borderRadius: Radius.md, padding: Spacing.md },
  noticeText: { ...Typography.metadata },
  infoNotice: { backgroundColor: Colors.infoSoft },
  infoNoticeText: { color: Colors.info },
  warningNotice: { backgroundColor: Colors.warningSoft },
  warningNoticeText: { color: Colors.warning },
  dangerNotice: { backgroundColor: Colors.dangerSoft },
  dangerNoticeText: { color: Colors.danger },
  successNotice: { backgroundColor: Colors.successSoft },
  successNoticeText: { color: Colors.success },
});
