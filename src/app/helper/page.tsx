import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSettlementDraft } from "@/lib/settlement";
import { getDictionary, type Locale } from "@/lib/i18n";
import { Card, Badge } from "@/components/ui";
import { MarkPresentButton } from "@/components/helper/mark-present-button";
import { HelperCalendarView } from "@/components/helper/calendar-view";

function rupees(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default async function HelperDashboard() {
  const user = await getCurrentUser();
  if (!user?.helperProfile) redirect("/login");

  const t = getDictionary(user.languagePref as Locale);
  const profile = user.helperProfile;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const paidSettlement = await prisma.monthlySettlement.findUnique({
    where: { helperId_month_year: { helperId: profile.id, month, year } },
  });

  // Once the month is settled, show the locked-in slip rather than a fresh
  // draft -- a fresh draft would deduct the same loan EMI a second time
  // since the loan is still "open" for next month's draft.
  const { input, result, loans } = paidSettlement?.paid
    ? {
        input: {
          attendance: {
            presentDays: paidSettlement.presentDays,
            absentDays: paidSettlement.absentDays,
            halfDays: paidSettlement.halfDays,
            paidLeaveDays: paidSettlement.paidLeaveDays,
            gaonDays: paidSettlement.gaonDays,
          },
        },
        result: { finalPayout: paidSettlement.finalPayout },
        loans: await prisma.loanEntry.findMany({ where: { helperId: profile.id } }),
      }
    : await buildSettlementDraft(profile.id, year, month);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayLog = await prisma.attendanceLog.findUnique({
    where: { helperId_date: { helperId: profile.id, date: today } },
  });

  const activeLoans = loans.filter((l) => !l.closed);
  const totalTaken = loans.reduce((s, l) => s + l.amount, 0);
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.remainingPrincipal, 0);
  const totalRepaid = totalTaken - totalOutstanding;
  const repaidPct = totalTaken > 0 ? Math.min(100, Math.round((totalRepaid / totalTaken) * 100)) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-lg text-neutral-500">{t.greeting},</p>
        <h1 className="text-2xl font-bold">{profile.name}</h1>
      </div>

      {profile.gaonMode && <Badge tone="blue">{t.gaon_mode_on}</Badge>}

      <MarkPresentButton
        t={t}
        alreadyMarked={Boolean(todayLog)}
        approved={Boolean(todayLog?.approvedByEmployer)}
      />

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span>₹</span> {t.your_salary}
          </div>
          <Badge tone={paidSettlement?.paid ? "green" : "yellow"}>
            {paidSettlement?.paid ? t.paid : t.not_paid_yet}
          </Badge>
        </div>
        <p className="text-sm text-neutral-500">{t.this_month}</p>
        <p className="mt-2 text-4xl font-extrabold text-teal-700 dark:text-teal-400">
          {rupees(result.finalPayout)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <div>
            {t.base_salary}: <span className="font-semibold">{rupees(profile.baseMonthlySalary)}</span>
          </div>
          <div>
            {t.days_present}: <span className="font-semibold">{input.attendance.presentDays}</span>
          </div>
          <div>
            {t.days_absent}: <span className="font-semibold">{input.attendance.absentDays}</span>
          </div>
        </div>
      </Card>

      {totalTaken > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span>🤝</span> {t.loan}
          </div>
          <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div className="h-full bg-teal-600" style={{ width: `${repaidPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-sm text-neutral-600 dark:text-neutral-300">
            <span>
              {t.total_taken}: {rupees(totalTaken)}
            </span>
            <span>
              {t.total_repaid}: {rupees(totalRepaid)}
            </span>
          </div>
          <p className="mt-1 text-right text-sm font-semibold text-amber-700 dark:text-amber-400">
            {t.loan_balance}: {rupees(totalOutstanding)}
          </p>
        </Card>
      )}

      <HelperCalendarView t={t} />
    </div>
  );
}
