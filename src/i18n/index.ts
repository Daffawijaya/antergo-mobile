import { useLanguageStore, type Language } from "@/stores/language-store";
import id from "./id";
import en from "./en";

/** Every translation key shared by both dictionaries. */
export type TranslationKey = keyof typeof id;

const dictionaries: Record<Language, Record<string, string>> = { id, en } as const;

/**
 * Return the translated string for `key` in the given `lang`.
 * Falls back to Indonesian if the key is missing in the target locale.
 */
export function t(key: TranslationKey, lang: Language): string {
  return dictionaries[lang][key] ?? dictionaries.id[key] ?? key;
}

/**
 * Return the translated string for `key` in the given `lang`.
 * Supports a simple `{name}` interpolation via the `params` argument.
 */
export function tWith(
  key: TranslationKey,
  lang: Language,
  params: Record<string, string | number>,
): string {
  let value = t(key, lang);
  for (const [k, v] of Object.entries(params)) {
    value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return value;
}

/**
 * React hook that returns the `t` and `tWith` helpers bound to the current
 * language. The component re-renders when the language changes.
 *
 * ```tsx
 * const { t } = useTranslation();
 * return <Text>{t("nav.home")}</Text>;
 * ```
 */
export function useTranslation() {
  const lang = useLanguageStore((s) => s.language);
  return {
    t: (key: TranslationKey) => t(key, lang),
    tWith: (key: TranslationKey, params: Record<string, string | number>) =>
      tWith(key, lang, params),
    lang,
  };
}
