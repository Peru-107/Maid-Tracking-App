import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { sortFlatNumbers } from "@/lib/format";
import { GateLogView } from "@/components/employer/gate-log-view";

export default async function GateLogPage() {
  const user = await getCurrentUser();
  const t = getDictionary(user!.languagePref as Locale);

  const residents = await prisma.residentProfile.findMany({
    where: { employerId: user!.id },
    select: { flatNumber: true },
  });
  const flatNumbers = sortFlatNumbers([...new Set(residents.map((r) => r.flatNumber))]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{t.gate_log}</h1>
        <p className="text-sm font-medium text-neutral-500">{t.gate_log_admin_description}</p>
      </div>
      <GateLogView t={t} flatNumbers={flatNumbers} />
    </div>
  );
}
