import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useLanguageStore, type Language } from "@/stores/language-store";
import { useTranslation } from "@/i18n";
import { AppIcon } from "@/components/app-icon";
import { useAppTheme } from "@/stores/theme-store";

const OPTIONS: { value: Language; labelKey: "language.indonesian" | "language.english" }[] = [
  { value: "id", labelKey: "language.indonesian" },
  { value: "en", labelKey: "language.english" },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { t, lang } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const handleSelect = async (value: Language) => {
    if (value === lang) return;
    await setLanguage(value);
  };

  return (
    <View className="flex-1 bg-background px-5 pt-8">
      {/* Header */}
      <View className="mb-6 flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => router.back()}
          className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
        >
          <AppIcon name="back" size={26} color={colors.text} />
        </Pressable>
        <Text className="font-bold text-xl text-foreground">
          {t("language.title")}
        </Text>
      </View>

      {/* Section title */}
      <Text className="mb-4 font-semibold text-base text-muted">
        {t("language.choose")}
      </Text>

      {/* Options */}
      <View className="gap-2">
        {OPTIONS.map((option) => {
          const selected = option.value === lang;
          return (
            <Pressable
              key={option.value}
              onPress={() => void handleSelect(option.value)}
              className={`flex-row items-center justify-between rounded-2xl border px-4 py-4 active:opacity-70 ${
                selected
                  ? "border-brand bg-brand/10"
                  : "border-border bg-surface"
              }`}
            >
              <Text
                className={`text-base font-medium ${
                  selected ? "text-brand-dark" : "text-foreground"
                }`}
              >
                {t(option.labelKey)}
              </Text>
              {selected ? (
                <AppIcon name="check" size={20} color="#D97706" />
              ) : (
                <View className="h-5 w-5 rounded-full border-2 border-border" />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
