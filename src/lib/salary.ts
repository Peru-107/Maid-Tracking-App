// Core monthly salary settlement engine. Pure functions only -- no I/O --
// so the business logic can be unit tested independently of Prisma/Next.

export type AttendanceCounts = {
  presentDays: number;
  halfDays: number;
  absentDays: number;
  paidLeaveDays: number;
  /** Days frozen because the helper was in "Gaon" (village) mode this month. */
  gaonDays: number;
};

export type SettlementInput = {
  baseSalary: number;
  totalDaysInMonth: number;
  attendance: AttendanceCounts;
  /** Sum of monthly EMI amounts due across all open loans this month. */
  loanEmiDue: number;
  /** Employer pressed "Skip Loan Deduction this Month". */
  loanEmiSkipRequested: boolean;
  /** Sum of unsettled mid-month Kharcha (petty cash) advances. */
  kharchaTotal: number;
  overtimeBonus: number;
  festivalBonus: number;
};

export type SettlementResult = {
  perDayWage: number;
  lossOfPay: number;
  gaonFreezeDeduction: number;
  loanEmiDue: number;
  loanEmiDeducted: number;
  /** True if the EMI was skipped, whether by manual request or Gaon mode. */
  loanEmiSkipped: boolean;
  gaonModeActive: boolean;
  kharchaDeducted: number;
  overtimeBonus: number;
  festivalBonus: number;
  finalPayout: number;
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculatePerDayWage(baseSalary: number, totalDaysInMonth: number): number {
  if (totalDaysInMonth <= 0) {
    throw new Error("totalDaysInMonth must be positive");
  }
  return baseSalary / totalDaysInMonth;
}

export function calculateMonthlySettlement(input: SettlementInput): SettlementResult {
  const { baseSalary, totalDaysInMonth, attendance } = input;

  const perDayWage = calculatePerDayWage(baseSalary, totalDaysInMonth);

  const lossOfPay = perDayWage * attendance.absentDays + perDayWage * 0.5 * attendance.halfDays;
  const gaonFreezeDeduction = perDayWage * attendance.gaonDays;
  const gaonModeActive = attendance.gaonDays > 0;

  // Gaon mode automatically suspends EMI deduction on top of any manual skip.
  const loanEmiSkipped = input.loanEmiSkipRequested || gaonModeActive;
  const loanEmiDeducted = loanEmiSkipped ? 0 : input.loanEmiDue;

  const kharchaDeducted = input.kharchaTotal;

  const finalPayout =
    baseSalary -
    lossOfPay -
    gaonFreezeDeduction -
    loanEmiDeducted -
    kharchaDeducted +
    input.overtimeBonus +
    input.festivalBonus;

  return {
    perDayWage: round2(perDayWage),
    lossOfPay: round2(lossOfPay),
    gaonFreezeDeduction: round2(gaonFreezeDeduction),
    loanEmiDue: round2(input.loanEmiDue),
    loanEmiDeducted: round2(loanEmiDeducted),
    loanEmiSkipped,
    gaonModeActive,
    kharchaDeducted: round2(kharchaDeducted),
    overtimeBonus: round2(input.overtimeBonus),
    festivalBonus: round2(input.festivalBonus),
    finalPayout: round2(finalPayout),
  };
}

/**
 * Applies a monthly EMI payment against a loan's remaining principal,
 * capping the deduction so a loan never goes negative on its final month.
 */
export function applyEmiToLoan(remainingPrincipal: number, monthlyEmi: number) {
  const amountPaid = Math.min(remainingPrincipal, monthlyEmi);
  const newRemaining = round2(remainingPrincipal - amountPaid);
  return { amountPaid: round2(amountPaid), newRemaining, closed: newRemaining <= 0 };
}
