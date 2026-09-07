import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { HelperWorkspace } from "@/components/employer/helper-workspace";
import { DeleteHelperButton } from "@/components/employer/delete-helper-button";
import { EditSalaryButton } from "@/components/employer/edit-salary-button";

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
        <Link href="/employer" className="text-sm text-teal-700 hover:underline dark:text-teal-400">
          ← {t.all_helpers}
        </Link>
        <h1 className="mt-1 text-xl font-bold">{helper.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <span>
            +91 {helper.phone.replace("+91", "")} · {t.base_salary} ₹
            {helper.baseMonthlySalary.toLocaleString("en-IN")}/mo
          </span>
          <EditSalaryButton t={t} helperId={helper.id} currentSalary={helper.baseMonthlySalary} />
        </div>
      </div>

      <HelperWorkspace
        t={t}
        helperId={helper.id}
        helperName={helper.name}
        helperPhone={helper.phone}
        loans={helper.loans}
        kharchas={helper.kharchas}
      />

      <div className="mt-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <DeleteHelperButton t={t} helperId={helper.id} helperName={helper.name} />
      </div>
    </div>
  );
}
