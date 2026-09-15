import { getCurrentUser } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/i18n";
import { ResidentGateLogList } from "@/components/resident/gate-log-list";

export default async function ResidentDashboard() {
  const user = await getCurrentUser();
  if (!user?.residentProfile) return null;

  const t = getDictionary(user.languagePref as Locale);
  const profile = user.residentProfile;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-lg font-medium text-neutral-500">{t.greeting},</p>
        <h1 className="text-2xl font-bold">{profile.name}</h1>
        <p className="text-sm font-medium text-neutral-500">
          {t.flat_number_placeholder}: {profile.flatNumber}
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold">{t.visitors_to_your_flat}</h2>
        <ResidentGateLogList t={t} />
      </div>
    </div>
  );
}
