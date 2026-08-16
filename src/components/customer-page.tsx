import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { useAppTheme } from "@/stores/theme-store";

export function CustomerPageHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="min-h-12 flex-row items-center gap-2">
      {onBack ? (
        <Pressable
          accessibilityLabel="Kembali"
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-muted"
        >
          <AppIcon name="back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View className="flex-1">
        <Text className="font-bold text-xl leading-6 text-foreground">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[13px] leading-[18px] text-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
export function CustomerPanel({
  children,
  title,
}: PropsWithChildren<{ title?: string }>) {
  return (
    <View className="gap-3 rounded-[18px] bg-surface-muted p-4">
      {title ? (
        <Text className="font-bold text-base text-foreground">{title}</Text>
      ) : null}
      {children}
    </View>
  );
}
export function CustomerChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-9 items-center justify-center rounded-full border px-3.5 ${selected ? "border-brand bg-brand" : "border-border bg-surface"}`}
    >
      <Text
        className={`font-semibold text-sm ${selected ? "text-on-brand" : "text-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
