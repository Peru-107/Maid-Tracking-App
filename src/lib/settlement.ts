import { endOfMonth, getDaysInMonth, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  applyLoanPaymentWaterfall,
  AttendanceCounts,
  calculateMonthlySettlement,
  round2,
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
  };

  for (const log of logs) {
    if (log.status === "PRESENT") counts.presentDays += 1;
    else if (log.status === "HALF_DAY") counts.halfDays += 1;
    else if (log.status === "ABSENT") counts.absentDays += 1;
    else if (log.status === "PAID_LEAVE") counts.paidLeaveDays += 1;
  }

  return counts;
}

export function getOpenLoans(helperId: string) {
  return prisma.loanEntry.findMany({
    where: { helperId, closed: false },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Every unsettled Kharcha advance, regardless of when it was logged. It gets
 * swept into whichever settlement is generated *next* -- not tied to a
 * calendar month -- so a Kharcha taken today lands in this cycle's payout as
 * soon as you settle, rather than waiting on a date match.
 */
export async function getUnsettledKharcha(helperId: string) {
  const entries = await prisma.kharchaEntry.findMany({
    where: { helperId, settled: false },
    orderBy: { date: "asc" },
  });
  return { total: entries.reduce((sum, e) => sum + e.amount, 0), entries };
}

export type SettlementOverrides = {
  /** Amount to actually deduct for loan repayment this month; defaults to the sum of scheduled EMIs. */
  loanEmiAmount?: number;
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
  const loanOutstandingTotal = loans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0);
  const { total: kharchaTotal, entries: kharchaEntries } = await getUnsettledKharcha(helperId);
  const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1, 1));

  const input: SettlementInput = {
    baseSalary: helper.baseMonthlySalary,
    totalDaysInMonth,
    attendance,
    loanEmiDue,
    loanOutstandingTotal,
    loanEmiAmount: overrides.loanEmiAmount ?? loanEmiDue,
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
      loanEmiDeducted: result.loanEmiDeducted,
      kharchaDeducted: result.kharchaDeducted,
      overtimeBonus: result.overtimeBonus,
      festivalBonus: result.festivalBonus,
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
      loanEmiDeducted: result.loanEmiDeducted,
      kharchaDeducted: result.kharchaDeducted,
      overtimeBonus: result.overtimeBonus,
      festivalBonus: result.festivalBonus,
      finalPayout: result.finalPayout,
      kharchas: { connect: kharchaEntries.map((k) => ({ id: k.id })) },
    },
  });
}

/**
 * Locks in a draft settlement: distributes the chosen loan repayment amount
 * across open loans (oldest first), marks the swept-up Kharcha entries as
 * settled, and flips the row to paid. This is the point of no return for
 * the month.
 */
export async function markSettlementPaid(settlementId: string) {
  const settlement = await prisma.monthlySettlement.findUniqueOrThrow({
    where: { id: settlementId },
    include: { kharchas: true },
  });
  if (settlement.paid) return settlement;

  const loans = await getOpenLoans(settlement.helperId);
  const payments = applyLoanPaymentWaterfall(loans, settlement.loanEmiDeducted);

  await prisma.$transaction(async (tx) => {
    for (const loan of loans) {
      const payment = payments.find((p) => p.loanId === loan.id)!;
      const amountDue = Math.min(loan.monthlyEmi, loan.remainingPrincipal);

      await tx.loanEntry.update({
        where: { id: loan.id },
        data: { remainingPrincipal: payment.newRemaining, closed: payment.closed },
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
          skipped: payment.amountPaid === 0,
          amountPaid: payment.amountPaid,
        },
        update: {
          amountDue,
          skipped: payment.amountPaid === 0,
          amountPaid: payment.amountPaid,
        },
      });
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

/**
 * Reverses markSettlementPaid: restores whatever each loan actually had
 * applied that month (from the LoanEmiEvent it wrote), reopens the loan if
 * it had been closed by that payment, un-settles the swept-up Kharcha
 * entries, and flips the row back to unpaid. For fixing an accidental tap.
 */
export async function unmarkSettlementPaid(settlementId: string) {
  const settlement = await prisma.monthlySettlement.findUniqueOrThrow({
    where: { id: settlementId },
    include: { kharchas: true },
  });
  if (!settlement.paid) return settlement;

  const loans = await prisma.loanEntry.findMany({ where: { helperId: settlement.helperId } });

  await prisma.$transaction(async (tx) => {
    for (const loan of loans) {
      const event = await tx.loanEmiEvent.findUnique({
        where: {
          loanId_month_year: { loanId: loan.id, month: settlement.month, year: settlement.year },
        },
      });
      if (!event) continue;

      if (event.amountPaid > 0) {
        await tx.loanEntry.update({
          where: { id: loan.id },
          data: { remainingPrincipal: round2(loan.remainingPrincipal + event.amountPaid), closed: false },
        });
      }
      await tx.loanEmiEvent.delete({ where: { id: event.id } });
    }

    await tx.kharchaEntry.updateMany({
      where: { id: { in: settlement.kharchas.map((k) => k.id) } },
      data: { settled: false, settlementId: null },
    });

    await tx.monthlySettlement.update({
      where: { id: settlement.id },
      data: { paid: false, paidAt: null },
    });
  });

  return prisma.monthlySettlement.findUniqueOrThrow({ where: { id: settlement.id } });
}
