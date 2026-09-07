import Link from "next/link";
import { Users, Wallet, HandCoins, CheckCircle2 } from "lucide-react";
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

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [pendingApprovals, currentMonthSettlements] = await Promise.all([
    prisma.attendanceLog.groupBy({
      by: ["helperId"],
      where: {
        helperId: { in: helpers.map((h) => h.id) },
        markedByHelper: true,
        approvedByEmployer: false,
      },
      _count: { _all: true },
    }),
    prisma.monthlySettlement.findMany({
      where: { helperId: { in: helpers.map((h) => h.id) }, year, month },
      select: { helperId: true, paid: true },
    }),
  ]);

  const pendingByHelper = new Map(pendingApprovals.map((p) => [p.helperId, p._count._all]));
  const paidThisMonth = currentMonthSettlements.filter((s) => s.paid).length;

  const totalPayroll = helpers.reduce((sum, h) => sum + h.baseMonthlySalary, 0);
  const totalOutstanding = helpers.reduce(
    (sum, h) => sum + h.loans.reduce((s, l) => s + l.remainingPrincipal, 0),
    0,
  );

  const dateLabel = now.toLocaleDateString(user!.languagePref, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-neutral-500">
          {t.greeting}, {user!.name ?? ""} · {dateLabel}
        </p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold">{t.your_helpers}</h1>
          <AddHelperForm t={t} />
        </div>
      </div>

      {helpers.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="flex flex-col gap-1 p-3">
            <Users size={16} aria-hidden="true" className="text-teal-600 dark:text-teal-400" />
            <span className="text-lg font-bold">{helpers.length}</span>
            <span className="text-xs font-medium text-neutral-500">{t.helpers_count_label}</span>
          </Card>
          <Card className="flex flex-col gap-1 p-3">
            <Wallet size={16} aria-hidden="true" className="text-teal-600 dark:text-teal-400" />
            <span className="text-lg font-bold">{rupees(totalPayroll)}</span>
            <span className="text-xs font-medium text-neutral-500">{t.monthly_payroll}</span>
          </Card>
          <Card className="flex flex-col gap-1 p-3">
            <HandCoins size={16} aria-hidden="true" className="text-amber-600 dark:text-amber-400" />
            <span className="text-lg font-bold">{totalOutstanding > 0 ? rupees(totalOutstanding) : t.none}</span>
            <span className="text-xs font-medium text-neutral-500">{t.outstanding_loans}</span>
          </Card>
          <Card className="flex flex-col gap-1 p-3">
            <CheckCircle2 size={16} aria-hidden="true" className="text-green-600 dark:text-green-400" />
            <span className="text-lg font-bold">
              {paidThisMonth}/{helpers.length}
            </span>
            <span className="text-xs font-medium text-neutral-500">{t.paid_this_month}</span>
          </Card>
        </div>
      )}

      {helpers.length === 0 ? (
        <Card className="p-8 text-center font-medium text-neutral-500">{t.no_helpers_yet}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {helpers.map((helper) => {
            const outstandingLoan = helper.loans.reduce((sum, l) => sum + l.remainingPrincipal, 0);
            const lastSettlement = helper.settlements[0];
            const pendingCount = pendingByHelper.get(helper.id) ?? 0;
            return (
              <Link key={helper.id} href={`/employer/helpers/${helper.id}`}>
                <Card className="flex h-full flex-col gap-2 p-4 transition-transform hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold">{helper.name}</h2>
                      <p className="text-sm font-medium text-neutral-500">+91 {helper.phone.replace("+91", "")}</p>
                    </div>
                    {pendingCount > 0 && (
                      <Badge tone="yellow">
                        {pendingCount} {t.pending_review}
                      </Badge>
                    )}
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
