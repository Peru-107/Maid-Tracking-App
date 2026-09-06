import { describe, expect, it } from "vitest";
import {
  applyEmiToLoan,
  applyLoanPaymentWaterfall,
  calculateMonthlySettlement,
  calculatePerDayWage,
} from "./salary";

describe("calculatePerDayWage", () => {
  it("divides base salary by days in month", () => {
    expect(calculatePerDayWage(9000, 30)).toBe(300);
  });

  it("throws for a non-positive month length", () => {
    expect(() => calculatePerDayWage(9000, 0)).toThrow();
  });
});

describe("calculateMonthlySettlement", () => {
  const base = {
    baseSalary: 9000,
    totalDaysInMonth: 30,
    loanEmiDue: 0,
    loanOutstandingTotal: 0,
    loanEmiAmount: 0,
    kharchaTotal: 0,
    overtimeBonus: 0,
    festivalBonus: 0,
  };

  it("pays full salary for a perfect attendance month", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0 },
    });
    expect(result.finalPayout).toBe(9000);
    expect(result.lossOfPay).toBe(0);
  });

  it("deducts per-day wage for absences and half for half-days", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 25, halfDays: 2, absentDays: 3, paidLeaveDays: 0 },
    });
    // perDayWage = 300; loss = 3*300 + 2*150 = 1200
    expect(result.perDayWage).toBe(300);
    expect(result.lossOfPay).toBe(1200);
    expect(result.finalPayout).toBe(7800);
  });

  it("does not penalize paid leave days", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 28, halfDays: 0, absentDays: 0, paidLeaveDays: 2 },
    });
    expect(result.lossOfPay).toBe(0);
    expect(result.finalPayout).toBe(9000);
  });

  it("deducts the loan repayment amount chosen for the month", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0 },
      loanEmiDue: 1000,
      loanOutstandingTotal: 5000,
      loanEmiAmount: 1000,
    });
    expect(result.loanEmiDeducted).toBe(1000);
    expect(result.finalPayout).toBe(8000);
  });

  it("adds the repayment back when the employer sets it to 0 (skip)", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0 },
      loanEmiDue: 1000,
      loanOutstandingTotal: 5000,
      loanEmiAmount: 0,
    });
    expect(result.loanEmiDeducted).toBe(0);
    expect(result.finalPayout).toBe(9000);
  });

  it("allows paying more than the scheduled EMI in a given month", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0 },
      loanEmiDue: 1000,
      loanOutstandingTotal: 5000,
      loanEmiAmount: 3000,
    });
    expect(result.loanEmiDeducted).toBe(3000);
    expect(result.finalPayout).toBe(6000);
  });

  it("clamps the repayment amount to what's actually outstanding", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0 },
      loanEmiDue: 1000,
      loanOutstandingTotal: 800,
      loanEmiAmount: 5000,
    });
    expect(result.loanEmiDeducted).toBe(800);
    expect(result.finalPayout).toBe(8200);
  });

  it("deducts mid-month kharcha advances in full", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0 },
      kharchaTotal: 500,
    });
    expect(result.kharchaDeducted).toBe(500);
    expect(result.finalPayout).toBe(8500);
  });

  it("adds overtime and festival bonuses on top of base", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0 },
      overtimeBonus: 300,
      festivalBonus: 2000,
    });
    expect(result.finalPayout).toBe(11300);
  });

  it("computes the full dynamic formula together", () => {
    const result = calculateMonthlySettlement({
      baseSalary: 8000,
      totalDaysInMonth: 30,
      attendance: { presentDays: 26, halfDays: 1, absentDays: 2, paidLeaveDays: 1 },
      loanEmiDue: 500,
      loanOutstandingTotal: 5000,
      loanEmiAmount: 500,
      kharchaTotal: 300,
      overtimeBonus: 200,
      festivalBonus: 0,
    });
    // perDayWage = 266.666...67; loss = 2*266.67 + 1*133.33 = 666.67
    expect(result.perDayWage).toBeCloseTo(266.67, 1);
    expect(result.finalPayout).toBeCloseTo(8000 - result.lossOfPay - 500 - 300 + 200, 1);
  });
});

describe("applyEmiToLoan", () => {
  it("pays the full EMI when principal is larger", () => {
    const result = applyEmiToLoan(10000, 1000);
    expect(result).toEqual({ amountPaid: 1000, newRemaining: 9000, closed: false });
  });

  it("caps the payment and closes the loan on the final month", () => {
    const result = applyEmiToLoan(400, 1000);
    expect(result).toEqual({ amountPaid: 400, newRemaining: 0, closed: true });
  });
});

describe("applyLoanPaymentWaterfall", () => {
  it("applies the full amount to a single loan", () => {
    const result = applyLoanPaymentWaterfall([{ id: "a", remainingPrincipal: 5000 }], 1200);
    expect(result).toEqual([{ loanId: "a", amountPaid: 1200, newRemaining: 3800, closed: false }]);
  });

  it("distributes across multiple loans oldest first, spilling into the next", () => {
    const loans = [
      { id: "old", remainingPrincipal: 800 },
      { id: "new", remainingPrincipal: 5000 },
    ];
    const result = applyLoanPaymentWaterfall(loans, 2000);
    expect(result).toEqual([
      { loanId: "old", amountPaid: 800, newRemaining: 0, closed: true },
      { loanId: "new", amountPaid: 1200, newRemaining: 3800, closed: false },
    ]);
  });

  it("pays nothing to later loans once the amount is exhausted", () => {
    const loans = [
      { id: "old", remainingPrincipal: 5000 },
      { id: "new", remainingPrincipal: 5000 },
    ];
    const result = applyLoanPaymentWaterfall(loans, 1000);
    expect(result).toEqual([
      { loanId: "old", amountPaid: 1000, newRemaining: 4000, closed: false },
      { loanId: "new", amountPaid: 0, newRemaining: 5000, closed: false },
    ]);
  });

  it("never pays more than a loan's outstanding principal", () => {
    const result = applyLoanPaymentWaterfall([{ id: "a", remainingPrincipal: 300 }], 10000);
    expect(result).toEqual([{ loanId: "a", amountPaid: 300, newRemaining: 0, closed: true }]);
  });
});
