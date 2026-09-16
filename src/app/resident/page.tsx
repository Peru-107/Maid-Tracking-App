import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { ResidentGateLogList } from "@/components/resident/gate-log-list";

export default async function ResidentDashboard() {
  const user = await getCurrentUser();
  // The admin can remove a resident's flat link (they moved out, or it was
  // a mistake) without deleting their login -- land here rather than a
  // blank page, since the layout's header still gives them a way to log
  // out and there's nothing else this account can do until re-linked.
  if (!user?.residentProfile) {
    const t = getDictionary((user?.languagePref ?? "en") as Locale);
    return <Card className="p-6 text-center font-medium text-neutral-500">{t.account_not_linked}</Card>;
  }

  const t = getDictionary(user.languagePref as Locale);
  const profile = user.residentProfile;
  const helperCount = await prisma.helperProfile.count({ where: { employerId: user.id } });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-lg font-medium text-neutral-500">{t.greeting},</p>
        <h1 className="text-2xl font-bold">{profile.name}</h1>
        <p className="text-sm font-medium text-neutral-500">
          {t.flat_number_placeholder}: {profile.flatNumber}
        </p>
      </div>

      <Link href="/resident/helpers">
        <Card className="flex items-center justify-between gap-3 p-4 transition-transform hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <Users size={20} aria-hidden="true" className="text-teal-600 dark:text-teal-400" />
            <div>
              <p className="font-bold">{t.your_helpers}</p>
              <p className="text-sm font-medium text-neutral-500">
                {helperCount > 0 ? `${helperCount} ${t.helpers_count_label}` : t.no_helpers_yet}
              </p>
            </div>
          </div>
          <ChevronRight size={18} aria-hidden="true" className="text-neutral-400" />
        </Card>
      </Link>

      <div>
        <h2 className="mb-2 text-lg font-bold">{t.visitors_to_your_flat}</h2>
        <ResidentGateLogList t={t} />
      </div>
    </div>
  );
}
