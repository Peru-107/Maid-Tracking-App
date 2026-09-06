import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";
import te from "./locales/te.json";
import ta from "./locales/ta.json";
import kn from "./locales/kn.json";
import bn from "./locales/bn.json";
import gu from "./locales/gu.json";
import pa from "./locales/pa.json";
import ml from "./locales/ml.json";
import or from "./locales/or.json";
import ur from "./locales/ur.json";
import as from "./locales/as.json";

export const dictionaries = { en, hi, mr, te, ta, kn, bn, gu, pa, ml, or, ur, as } as const;

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
  { code: "gu", label: "ગુજરાતી" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ml", label: "മലയാളം" },
  { code: "or", label: "ଓଡ଼ିଆ" },
  { code: "ur", label: "اردو" },
  { code: "as", label: "অসমীয়া" },
];

export function isLocale(value: string): value is Locale {
  return value in dictionaries;
}

export function getDictionary(locale: string): Record<TranslationKey, string> {
  return dictionaries[isLocale(locale) ? locale : "en"];
}
