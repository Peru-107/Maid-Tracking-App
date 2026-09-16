import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { AddResidentForm } from "@/components/employer/add-resident-form";
import { BulkAddFlatsForm } from "@/components/employer/bulk-add-flats-form";
import { ResidentCard } from "@/components/employer/resident-card";

export default async function ResidentsPage() {
  const user = await getCurrentUser();
  const t = getDictionary(user!.languagePref as Locale);

  const residents = await prisma.residentProfile.findMany({
    // Excludes the admin's own self-linked "My Flat" profile. The explicit
    // OR (rather than NOT: { userId: user!.id }) matters here: SQL's
    // three-valued logic means "NOT (NULL = x)" is still NULL, which WHERE
    // discards -- that would silently drop every placeholder flat with no
    // resident onboarded yet (userId IS NULL).
    where: {
      employerId: user!.id,
      OR: [{ userId: null }, { userId: { not: user!.id } }],
    },
  });

  // flatNumber is a plain string, so a DB-level sort would put "1101" before
  // "102" lexicographically -- sort numerically here whenever every flat
  // number actually parses as one (true for the floor*100+unit scheme).
  function byFlatNumber(a: { flatNumber: string }, b: { flatNumber: string }) {
    const numA = Number(a.flatNumber);
    const numB = Number(b.flatNumber);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
    return a.flatNumber.localeCompare(b.flatNumber);
  }

  // Grouped by wing so a 100+ flat society is actually browsable -- flats
  // with no wing set (added before this feature, or manually without one)
  // land in a trailing ungrouped section instead of disappearing.
  const wingGroups = new Map<string, typeof residents>();
  for (const resident of residents) {
    const key = resident.wing ?? "";
    if (!wingGroups.has(key)) wingGroups.set(key, []);
    wingGroups.get(key)!.push(resident);
  }
  const sortedWings = [...wingGroups.keys()].sort((a, b) => {
    if (a === "") return 1;
    if (b === "") return -1;
    return a.localeCompare(b);
  });
  for (const group of wingGroups.values()) group.sort(byFlatNumber);

  const onboardedCount = residents.filter((r) => r.phone).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">{t.residents}</h1>
          {residents.length > 0 && (
            <p className="text-sm font-medium text-neutral-500">
              {onboardedCount}/{residents.length} {t.onboarded_count_label}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkAddFlatsForm t={t} />
          <AddResidentForm t={t} />
        </div>
      </div>

      {residents.length === 0 ? (
        <Card className="p-8 text-center font-medium text-neutral-500">{t.no_residents_yet}</Card>
      ) : (
        sortedWings.map((wing) => (
          <div key={wing || "ungrouped"} className="flex flex-col gap-3">
            {sortedWings.length > 1 && (
              <h2 className="text-sm font-bold text-neutral-500">{wing || t.no_wing_label}</h2>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {wingGroups.get(wing)!.map((resident) => (
                <ResidentCard
                  key={resident.id}
                  t={t}
                  residentId={resident.id}
                  currentName={resident.name}
                  currentPhone={resident.phone}
                  currentFlatNumber={resident.flatNumber}
                  currentWing={resident.wing}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
