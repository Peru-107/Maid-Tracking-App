import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/i18n";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/helper/language-switcher";

export default async function HelperLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "HELPER") redirect("/employer");

  const locale = user.languagePref as Locale;
  const t = getDictionary(locale);
  const dir = locale === "ur" ? "rtl" : "ltr";

  return (
    <div
      dir={dir}
      className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-neutral-950 dark:to-neutral-900"
    >
      <header className="sticky top-0 z-10 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.06),0_4px_16px_-8px_rgba(15,23,42,0.15)] backdrop-blur dark:bg-neutral-900/90 dark:shadow-[0_1px_0_rgba(255,255,255,0.06),0_4px_16px_-8px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-lg font-bold text-teal-700 dark:text-teal-400">
            {t.app_name}
          </span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} label={t.language} />
            <LogoutButton label={t.logout} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}
