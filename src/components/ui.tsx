import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/app-icon";
import { Colors } from "@/constants/colors";
import { useAppTheme } from "@/stores/theme-store";

const buttonClasses = {
  primary: "bg-brand rounded-full",
  secondary: "rounded-xl border border-border bg-surface",
  danger:
    "rounded-xl border border-danger bg-surface-muted",
} as const;
const buttonTextClasses = {
  primary: "text-on-brand",
  secondary: "text-foreground",
  danger: "text-danger",
} as const;

export function Screen({
  children,
  scroll = true,
  contentStyle,
  className = "",
  padded = true,
  scrollBottomPadding = true,
  onScroll,
  header,
}: PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  className?: string;
  padded?: boolean;
  scrollBottomPadding?: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  header?: ReactNode;
}>) {
  const { height: screenHeight } = useWindowDimensions();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const content = (
    <View
      className={`flex-1 gap-4 ${padded ? "px-5 pt-3" : ""} ${className}`}
      style={[{ paddingTop: padded ? insets.top : undefined }, contentStyle]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={{ backgroundColor: colors.background }}
      edges={["left", "right"]}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={{
            flexGrow: 1,
            minHeight: screenHeight,
            backgroundColor: colors.background,
            paddingBottom: scrollBottomPadding ? 16 : 0,
          }}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {/* Overlay rendered above the scroll content (e.g. a sticky header). */}
      {header}
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
    <View className="flex-row items-start gap-3">
      <View className="flex-1 gap-1 py-1">
        {eyebrow ? (
          <Text className="font-extrabold text-xs uppercase tracking-wider text-brand-dark">
            {eyebrow}
          </Text>
        ) : null}
        <Text className="font-extrabold text-[22px] leading-7 text-foreground">
          {title}
        </Text>
        {description ? (
          <Text className="font-sans text-[15px] leading-[22px] text-muted">
            {description}
          </Text>
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
    <View className="flex-row items-center justify-between gap-3">
      <Text className="font-extrabold text-lg leading-6 text-foreground">
        {title}
      </Text>
      {action}
    </View>
  );
}

export function Card({
  children,
  muted = false,
  style,
  className = "",
  padded = true,
  scrollBottomPadding = true,
}: PropsWithChildren<{
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
  padded?: boolean;
  scrollBottomPadding?: boolean;
}>) {
  return (
    <View
      className={`${muted ? "bg-surface-muted" : "border border-border bg-surface elevation-sm"} gap-3 rounded-lg p-4 ${className}`}
      style={style}
    >
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
    <View className="gap-2">
      <Text className="font-bold text-[13px] leading-[18px] text-foreground">
        {label}
      </Text>
      <TextInput
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        className={`min-h-12 rounded-lg border bg-surface px-[15px] font-sans text-base text-foreground ${multiline ? "min-h-[92px] pt-3.5" : ""} ${error ? "border-danger bg-surface-muted" : "border-border"}`}
        style={style}
        textAlignVertical={multiline ? "top" : "center"}
        {...props}
      />
      {error ? (
        <Text className="font-medium text-[13px] text-danger">{error}</Text>
      ) : null}
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
  className = "",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { colors } = useAppTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      className={`${compact ? "min-h-9 px-3.5" : "min-h-12 px-4"} items-center justify-center active:opacity-80 ${buttonClasses[variant]} ${inactive ? "opacity-50" : ""} ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary"
              ? Colors.onPrimary
              : variant === "danger"
                ? Colors.danger
                : Colors.primary
          }
        />
      ) : (
        <Text
          className="font-extrabold text-[15px] leading-5"
          style={{
            color:
              variant === "primary"
                ? Colors.onPrimary
                : variant === "danger"
                  ? Colors.danger
                  : colors.text,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function BackButton({
  onPress,
  floating = false,
  title,
}: {
  onPress: () => void;
  floating?: boolean;
  title?: string;
}) {
  const { mode } = useAppTheme();
  const color = mode === "dark" ? "#FFFFFF" : "#000000";
  const icon = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Kembali"
      onPress={onPress}
      className={`h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70 ${floating ? "bg-surface elevation-md" : "bg-transparent"}`}
    >
      <AppIcon name="back" size={26} color={color} />
    </Pressable>
  );
  if (title) {
    return (
      <View className="flex-row items-center">
        {icon}
        <Text
          className="font-bold text-[22px] leading-7"
          style={{ color }}
        >
          {title}
        </Text>
      </View>
    );
  }
  return icon;
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
    <View className="min-h-[220px] items-center justify-center gap-2 p-6">
      {type === "loading" ? (
        <ActivityIndicator color={Colors.primary} size="large" />
      ) : (
        <View
          className={`mb-2 h-[58px] w-[58px] items-center justify-center rounded-full ${type === "error" ? "bg-surface-muted" : "bg-surface-muted"}`}
        >
          {type === "error" ? (
            <AppIcon name="alert" size={26} color={Colors.danger} />
          ) : (
            <AppIcon name="empty" size={26} color={Colors.primary} />
          )}
        </View>
      )}
      <Text className="text-center font-bold text-base text-foreground">
        {title ??
          (type === "loading"
            ? "Memuat…"
            : type === "empty"
              ? "Belum ada data"
              : "Terjadi kesalahan")}
      </Text>
      {message ? (
        <Text className="text-center font-sans text-[15px] leading-[22px] text-muted">
          {message}
        </Text>
      ) : null}
      {action ? <View className="mt-3 min-w-40">{action}</View> : null}
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
    <View className="flex-row items-start justify-between gap-4 py-0.5">
      <Text className="font-medium text-[13px] leading-[18px] text-muted">
        {label}
      </Text>
      <Text className="shrink text-right font-bold text-[13px] leading-[18px] text-foreground">
        {value}
      </Text>
    </View>
  );
}

const noticeClasses = {
  info: "bg-surface-muted text-blue-500",
  warning:
    "bg-surface-muted text-amber-500",
  danger: "bg-surface-muted text-red-500",
  success:
    "bg-surface-muted text-emerald-500",
} as const;
export function Notice({
  children,
  tone = "info",
}: PropsWithChildren<{ tone?: keyof typeof noticeClasses }>) {
  return (
    <View
      className={`rounded-lg p-3 ${noticeClasses[tone]
        .split(" ")
        .filter((item) => item.startsWith("bg-") || item.startsWith("dark:bg-"))
        .join(" ")}`}
    >
      <Text
        className={`font-medium text-[13px] leading-[18px] ${noticeClasses[tone]
          .split(" ")
          .filter(
            (item) => item.startsWith("text-") || item.startsWith("dark:text-"),
          )
          .join(" ")}`}
      >
        {children}
      </Text>
    </View>
  );
}
