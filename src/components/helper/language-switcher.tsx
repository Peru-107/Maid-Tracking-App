"use client";

import { useRouter } from "next/navigation";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const router = useRouter();

  async function handleChange(locale: string) {
    await fetch("/api/me/language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-neutral-500">🌐 {label}</span>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-base dark:border-neutral-700 dark:bg-neutral-900"
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
