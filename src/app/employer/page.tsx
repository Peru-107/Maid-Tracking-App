import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { rupees } from "@/lib/format";
import { Card, Badge } from "@/components/ui";
import { AddHelperForm } from "@/components/employer/add-helper-form";

export default async function EmployerDashboard() {
  const user = await getCurrentUser();
  const t = getDictionary(user!.languagePref as Locale);

  const helpers = await prisma.helperProfile.findMany({
    where: { employerId: user!.id },
    orderBy: { createdAt: "asc" },
    include: {
      loans: { where: { closed: false } },
      settlements: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 1 },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">{t.your_helpers}</h1>
        <AddHelperForm t={t} />
      </div>

      {helpers.length === 0 ? (
        <Card className="p-8 text-center font-medium text-neutral-500">{t.no_helpers_yet}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {helpers.map((helper) => {
            const outstandingLoan = helper.loans.reduce((sum, l) => sum + l.remainingPrincipal, 0);
            const lastSettlement = helper.settlements[0];
            return (
              <Link key={helper.id} href={`/employer/helpers/${helper.id}`}>
                <Card className="flex h-full flex-col gap-2 p-4 transition-transform hover:-translate-y-0.5">
                  <div>
                    <h2 className="text-lg font-bold">{helper.name}</h2>
                    <p className="text-sm font-medium text-neutral-500">+91 {helper.phone.replace("+91", "")}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <div>
                      <div className="font-medium text-neutral-500">{t.base_salary}</div>
                      <div className="font-bold">{rupees(helper.baseMonthlySalary)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-neutral-500">{t.loan_balance}</div>
                      <div className="font-bold">
                        {outstandingLoan > 0 ? rupees(outstandingLoan) : t.none}
                      </div>
                    </div>
                    {lastSettlement && (
                      <div>
                        <div className="font-medium text-neutral-500">{t.last_settlement}</div>
                        <Badge tone={lastSettlement.paid ? "green" : "yellow"}>
                          {lastSettlement.paid ? t.paid : t.not_paid_yet}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
