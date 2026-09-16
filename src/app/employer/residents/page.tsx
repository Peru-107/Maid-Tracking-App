import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { AddResidentForm } from "@/components/employer/add-resident-form";
import { ResidentCard } from "@/components/employer/resident-card";

export default async function ResidentsPage() {
  const user = await getCurrentUser();
  const t = getDictionary(user!.languagePref as Locale);

  const residents = await prisma.residentProfile.findMany({
    // Excludes the admin's own self-linked "My Flat" profile.
    where: { employerId: user!.id, NOT: { userId: user!.id } },
    orderBy: { flatNumber: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">{t.residents}</h1>
        <AddResidentForm t={t} />
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
