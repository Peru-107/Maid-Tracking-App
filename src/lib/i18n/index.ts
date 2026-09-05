import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";
import te from "./locales/te.json";
import ta from "./locales/ta.json";
import kn from "./locales/kn.json";
import bn from "./locales/bn.json";

export const dictionaries = { en, hi, mr, te, ta, kn, bn } as const;

export type Locale = keyof typeof dictionaries;
export type TranslationKey = keyof typeof en;

export const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
  { code: "te", label: "తెలుగు" },
  { code: "ta", label: "தமிழ்" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "bn", label: "বাংলা" },
];

export function isLocale(value: string): value is Locale {
  return value in dictionaries;
}

export function getDictionary(locale: string): Record<TranslationKey, string> {
  return dictionaries[isLocale(locale) ? locale : "en"];
}
