import { differenceInCalendarDays, endOfMonth, getDaysInMonth, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  applyEmiToLoan,
  AttendanceCounts,
  calculateMonthlySettlement,
  SettlementInput,
} from "@/lib/salary";

function monthRange(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return { start, end };
}

export async function getAttendanceCounts(
  helperId: string,
  year: number,
  month: number,
): Promise<AttendanceCounts> {
  const { start, end } = monthRange(year, month);

  const logs = await prisma.attendanceLog.findMany({
    where: { helperId, date: { gte: start, lte: end } },
  });

  const counts: AttendanceCounts = {
    presentDays: 0,
    halfDays: 0,
    absentDays: 0,
    paidLeaveDays: 0,
    gaonDays: 0,
  };

  for (const log of logs) {
    if (log.status === "PRESENT") counts.presentDays += 1;
    else if (log.status === "HALF_DAY") counts.halfDays += 1;
    else if (log.status === "ABSENT") counts.absentDays += 1;
    else if (log.status === "PAID_LEAVE") counts.paidLeaveDays += 1;
  }

  const gaonPeriods = await prisma.gaonPeriod.findMany({
    where: {
      helperId,
      startDate: { lte: end },
      OR: [{ endDate: null }, { endDate: { gte: start } }],
    },
  });

  const now = new Date();
  let gaonDays = 0;
  for (const period of gaonPeriods) {
    const periodStart = period.startDate > start ? period.startDate : start;
    const periodEndRaw = period.endDate ?? now;
    const periodEnd = periodEndRaw < end ? periodEndRaw : end;
    if (periodEnd >= periodStart) {
      gaonDays += differenceInCalendarDays(periodEnd, periodStart) + 1;
    }
  }
  counts.gaonDays = Math.min(gaonDays, getDaysInMonth(start));

  return counts;
}

export function getOpenLoans(helperId: string) {
  return prisma.loanEntry.findMany({
    where: { helperId, closed: false },
    orderBy: { createdAt: "asc" },
  });
}

export async function getUnsettledKharcha(helperId: string, year: number, month: number) {
  const { start, end } = monthRange(year, month);
  const entries = await prisma.kharchaEntry.findMany({
    where: { helperId, settled: false, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });
  return { total: entries.reduce((sum, e) => sum + e.amount, 0), entries };
}

export type SettlementOverrides = {
  loanEmiSkipRequested?: boolean;
  overtimeBonus?: number;
  festivalBonus?: number;
};

export async function buildSettlementDraft(
  helperId: string,
  year: number,
  month: number,
  overrides: SettlementOverrides = {},
) {
  const helper = await prisma.helperProfile.findUniqueOrThrow({ where: { id: helperId } });
  const attendance = await getAttendanceCounts(helperId, year, month);
  const loans = await getOpenLoans(helperId);
  const loanEmiDue = loans.reduce(
    (sum, loan) => sum + Math.min(loan.monthlyEmi, loan.remainingPrincipal),
    0,
  );
  const { total: kharchaTotal, entries: kharchaEntries } = await getUnsettledKharcha(
    helperId,
    year,
    month,
  );
  const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1, 1));

  const input: SettlementInput = {
    baseSalary: helper.baseMonthlySalary,
    totalDaysInMonth,
    attendance,
    loanEmiDue,
    loanEmiSkipRequested: overrides.loanEmiSkipRequested ?? false,
    kharchaTotal,
    overtimeBonus: overrides.overtimeBonus ?? 0,
    festivalBonus: overrides.festivalBonus ?? 0,
  };

  const result = calculateMonthlySettlement(input);
  return { helper, input, result, loans, kharchaEntries, totalDaysInMonth };
}

/** Creates or updates the (still-unpaid) draft settlement row for a month. */
export async function saveSettlementDraft(
  helperId: string,
  year: number,
  month: number,
  overrides: SettlementOverrides,
) {
  const { input, result, kharchaEntries } = await buildSettlementDraft(
    helperId,
    year,
    month,
    overrides,
  );

  return prisma.monthlySettlement.upsert({
    where: { helperId_month_year: { helperId, month, year } },
    create: {
      helperId,
      month,
      year,
      baseSalary: input.baseSalary,
      totalDaysInMonth: input.totalDaysInMonth,
      presentDays: input.attendance.presentDays,
      absentDays: input.attendance.absentDays,
      halfDays: input.attendance.halfDays,
      paidLeaveDays: input.attendance.paidLeaveDays,
      perDayWage: result.perDayWage,
      lossOfPay: result.lossOfPay,
      loanEmiDue: result.loanEmiDue,
      loanEmiSkipped: result.loanEmiSkipped,
      loanEmiDeducted: result.loanEmiDeducted,
      kharchaDeducted: result.kharchaDeducted,
      overtimeBonus: result.overtimeBonus,
      festivalBonus: result.festivalBonus,
      gaonModeActive: result.gaonModeActive,
      gaonDays: input.attendance.gaonDays,
      gaonFreezeDeduction: result.gaonFreezeDeduction,
      finalPayout: result.finalPayout,
      kharchas: { connect: kharchaEntries.map((k) => ({ id: k.id })) },
    },
    update: {
      baseSalary: input.baseSalary,
      totalDaysInMonth: input.totalDaysInMonth,
      presentDays: input.attendance.presentDays,
      absentDays: input.attendance.absentDays,
      halfDays: input.attendance.halfDays,
      paidLeaveDays: input.attendance.paidLeaveDays,
      perDayWage: result.perDayWage,
      lossOfPay: result.lossOfPay,
      loanEmiDue: result.loanEmiDue,
      loanEmiSkipped: result.loanEmiSkipped,
      loanEmiDeducted: result.loanEmiDeducted,
      kharchaDeducted: result.kharchaDeducted,
      overtimeBonus: result.overtimeBonus,
      festivalBonus: result.festivalBonus,
      gaonModeActive: result.gaonModeActive,
      gaonDays: input.attendance.gaonDays,
      gaonFreezeDeduction: result.gaonFreezeDeduction,
      finalPayout: result.finalPayout,
      kharchas: { connect: kharchaEntries.map((k) => ({ id: k.id })) },
    },
  });
}

/**
 * Locks in a draft settlement: applies (or skips) the loan EMI against each
 * open loan's principal, marks the swept-up Kharcha entries as settled, and
 * flips the row to paid. This is the point of no return for the month.
 */
export async function markSettlementPaid(settlementId: string) {
  const settlement = await prisma.monthlySettlement.findUniqueOrThrow({
    where: { id: settlementId },
    include: { kharchas: true },
  });
  if (settlement.paid) return settlement;

  const loans = await getOpenLoans(settlement.helperId);

  await prisma.$transaction(async (tx) => {
    for (const loan of loans) {
      const amountDue = Math.min(loan.monthlyEmi, loan.remainingPrincipal);
      if (settlement.loanEmiSkipped) {
        await tx.loanEmiEvent.upsert({
          where: {
            loanId_month_year: { loanId: loan.id, month: settlement.month, year: settlement.year },
          },
          create: {
            loanId: loan.id,
            month: settlement.month,
            year: settlement.year,
            amountDue,
            skipped: true,
            amountPaid: 0,
          },
          update: { amountDue, skipped: true, amountPaid: 0 },
        });
      } else {
        const { amountPaid, newRemaining, closed } = applyEmiToLoan(
          loan.remainingPrincipal,
          loan.monthlyEmi,
        );
        await tx.loanEntry.update({
          where: { id: loan.id },
          data: { remainingPrincipal: newRemaining, closed },
        });
        await tx.loanEmiEvent.upsert({
          where: {
            loanId_month_year: { loanId: loan.id, month: settlement.month, year: settlement.year },
          },
          create: {
            loanId: loan.id,
            month: settlement.month,
            year: settlement.year,
            amountDue,
            skipped: false,
            amountPaid,
          },
          update: { amountDue, skipped: false, amountPaid },
        });
      }
    }

    await tx.kharchaEntry.updateMany({
      where: { id: { in: settlement.kharchas.map((k) => k.id) } },
      data: { settled: true, settlementId: settlement.id },
    });

    await tx.monthlySettlement.update({
      where: { id: settlement.id },
      data: { paid: true, paidAt: new Date() },
    });
  });

  return prisma.monthlySettlement.findUniqueOrThrow({ where: { id: settlement.id } });
}
