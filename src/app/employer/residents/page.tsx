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
  residents.sort((a, b) => {
    const numA = Number(a.flatNumber);
    const numB = Number(b.flatNumber);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
    return a.flatNumber.localeCompare(b.flatNumber);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">{t.residents}</h1>
        <div className="flex flex-wrap gap-2">
          <BulkAddFlatsForm t={t} />
          <AddResidentForm t={t} />
        </div>
      </div>

      {residents.length === 0 ? (
        <Card className="p-8 text-center font-medium text-neutral-500">{t.no_residents_yet}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {residents.map((resident) => (
            <ResidentCard
              key={resident.id}
              t={t}
              residentId={resident.id}
              currentName={resident.name}
              currentPhone={resident.phone}
              currentFlatNumber={resident.flatNumber}
            />
          ))}
        </div>
      )}
    </div>
  );
}
