// Core monthly salary settlement engine. Pure functions only -- no I/O --
// so the business logic can be unit tested independently of Prisma/Next.

export type AttendanceCounts = {
  presentDays: number;
  halfDays: number;
  absentDays: number;
  paidLeaveDays: number;
};

export type SettlementInput = {
  baseSalary: number;
  totalDaysInMonth: number;
  attendance: AttendanceCounts;
  /** Sum of monthly EMI amounts scheduled across all open loans -- the suggested default. */
  loanEmiDue: number;
  /** Sum of remaining principal across all open loans -- the hard cap on this month's deduction. */
  loanOutstandingTotal: number;
  /**
   * What the employer actually wants deducted this month. Repayments vary in
   * practice (a bit more, a bit less, or skipped by setting this to 0), so
   * this is editable and independent of loanEmiDue.
   */
  loanEmiAmount: number;
  /** Sum of unsettled mid-month Kharcha (petty cash) advances. */
  kharchaTotal: number;
  overtimeBonus: number;
  festivalBonus: number;
};

export type SettlementResult = {
  perDayWage: number;
  lossOfPay: number;
  loanEmiDue: number;
  loanEmiDeducted: number;
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

  // Clamp to [0, outstanding] so a loan can never be over-deducted or driven negative.
  const loanEmiDeducted = Math.min(Math.max(input.loanEmiAmount, 0), input.loanOutstandingTotal);

  const kharchaDeducted = input.kharchaTotal;

  const finalPayout =
    baseSalary - lossOfPay - loanEmiDeducted - kharchaDeducted + input.overtimeBonus + input.festivalBonus;

  return {
    perDayWage: round2(perDayWage),
    lossOfPay: round2(lossOfPay),
    loanEmiDue: round2(input.loanEmiDue),
    loanEmiDeducted: round2(loanEmiDeducted),
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

export type LoanForWaterfall = { id: string; remainingPrincipal: number };
export type LoanPaymentResult = { loanId: string; amountPaid: number; newRemaining: number; closed: boolean };

/**
 * Distributes a single total repayment amount across multiple open loans,
 * oldest first, so a helper with more than one loan still gets one editable
 * "how much this month" figure instead of one per loan.
 */
export function applyLoanPaymentWaterfall(
  loans: LoanForWaterfall[],
  totalAmount: number,
): LoanPaymentResult[] {
  let remaining = round2(Math.max(totalAmount, 0));

  return loans.map((loan) => {
    const amountPaid = round2(Math.min(remaining, loan.remainingPrincipal));
    const newRemaining = round2(loan.remainingPrincipal - amountPaid);
    remaining = round2(remaining - amountPaid);
    return { loanId: loan.id, amountPaid, newRemaining, closed: newRemaining <= 0 };
  });
}
