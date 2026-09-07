import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/i18n";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/helper/language-switcher";

export default async function EmployerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "EMPLOYER") redirect("/helper");

  const locale = user.languagePref as Locale;
  const t = getDictionary(locale);
  const dir = locale === "ur" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-10 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.06),0_4px_16px_-8px_rgba(15,23,42,0.15)] backdrop-blur dark:bg-neutral-900/90 dark:shadow-[0_1px_0_rgba(255,255,255,0.06),0_4px_16px_-8px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/employer" className="flex items-center gap-2 text-lg font-bold text-teal-700 dark:text-teal-400">
            {t.app_name}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher current={locale} label={t.language} />
            <LogoutButton label={t.logout} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
