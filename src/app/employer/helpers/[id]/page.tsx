import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { HelperWorkspace } from "@/components/employer/helper-workspace";
import { DeleteHelperButton } from "@/components/employer/delete-helper-button";
import { EditHelperButton } from "@/components/employer/edit-helper-button";
import { Badge } from "@/components/ui";

const CATEGORY_KEY = {
  MAID: "category_maid",
  COOK: "category_cook",
  GARDENER: "category_gardener",
  GARBAGE_COLLECTOR: "category_garbage_collector",
  WATCHMAN: "category_watchman",
} as const;

export default async function HelperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const t = getDictionary(user!.languagePref as Locale);

  const helper = await prisma.helperProfile.findUnique({
    where: { id },
    include: {
      loans: { orderBy: { createdAt: "desc" } },
      kharchas: { where: { settled: false }, orderBy: { date: "desc" } },
    },
  });

  if (!helper || helper.employerId !== user!.id) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/employer"
          className="flex items-center gap-1 text-sm font-bold text-teal-700 hover:underline dark:text-teal-400"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {t.all_helpers}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-xl font-bold">{helper.name}</h1>
          {helper.category !== "MAID" && (
            <Badge tone="blue">
              {t[CATEGORY_KEY[helper.category]]}
              {helper.shift && ` · ${helper.shift === "DAY" ? t.shift_day : t.shift_night}`}
            </Badge>
          )}
        </div>
        <EditHelperButton
          t={t}
          helperId={helper.id}
          currentName={helper.name}
          currentPhone={helper.phone}
          currentSalary={helper.baseMonthlySalary}
          currentUpiId={helper.upiId}
          currentCategory={helper.category}
          currentShift={helper.shift}
        />
      </div>

      <HelperWorkspace
        t={t}
        helperId={helper.id}
        helperName={helper.name}
        helperPhone={helper.phone}
        helperUpiId={helper.upiId}
        loans={helper.loans}
        kharchas={helper.kharchas}
      />

      <div className="mt-2 pt-2">
        <DeleteHelperButton t={t} helperId={helper.id} helperName={helper.name} />
      </div>
    </div>
  );
}
