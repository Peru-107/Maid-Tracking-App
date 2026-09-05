import { describe, expect, it } from "vitest";
import { applyEmiToLoan, calculateMonthlySettlement, calculatePerDayWage } from "./salary";

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
    loanEmiSkipRequested: false,
    kharchaTotal: 0,
    overtimeBonus: 0,
    festivalBonus: 0,
  };

  it("pays full salary for a perfect attendance month", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0, gaonDays: 0 },
    });
    expect(result.finalPayout).toBe(9000);
    expect(result.lossOfPay).toBe(0);
  });

  it("deducts per-day wage for absences and half for half-days", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 25, halfDays: 2, absentDays: 3, paidLeaveDays: 0, gaonDays: 0 },
    });
    // perDayWage = 300; loss = 3*300 + 2*150 = 1200
    expect(result.perDayWage).toBe(300);
    expect(result.lossOfPay).toBe(1200);
    expect(result.finalPayout).toBe(7800);
  });

  it("does not penalize paid leave days", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 28, halfDays: 0, absentDays: 0, paidLeaveDays: 2, gaonDays: 0 },
    });
    expect(result.lossOfPay).toBe(0);
    expect(result.finalPayout).toBe(9000);
  });

  it("deducts the loan EMI when not skipped", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0, gaonDays: 0 },
      loanEmiDue: 1000,
    });
    expect(result.loanEmiDeducted).toBe(1000);
    expect(result.loanEmiSkipped).toBe(false);
    expect(result.finalPayout).toBe(8000);
  });

  it("adds the EMI back and skips it when the employer requests a skip", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0, gaonDays: 0 },
      loanEmiDue: 1000,
      loanEmiSkipRequested: true,
    });
    expect(result.loanEmiDeducted).toBe(0);
    expect(result.loanEmiSkipped).toBe(true);
    expect(result.finalPayout).toBe(9000);
  });

  it("deducts mid-month kharcha advances in full", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0, gaonDays: 0 },
      kharchaTotal: 500,
    });
    expect(result.kharchaDeducted).toBe(500);
    expect(result.finalPayout).toBe(8500);
  });

  it("adds overtime and festival bonuses on top of base", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 30, halfDays: 0, absentDays: 0, paidLeaveDays: 0, gaonDays: 0 },
      overtimeBonus: 300,
      festivalBonus: 2000,
    });
    expect(result.finalPayout).toBe(11300);
  });

  it("freezes accrual and auto-suspends EMI during Gaon mode", () => {
    const result = calculateMonthlySettlement({
      ...base,
      attendance: { presentDays: 15, halfDays: 0, absentDays: 0, paidLeaveDays: 0, gaonDays: 15 },
      loanEmiDue: 1000,
    });
    expect(result.gaonModeActive).toBe(true);
    expect(result.loanEmiSkipped).toBe(true);
    expect(result.loanEmiDeducted).toBe(0);
    // 15 days frozen at 300/day = 4500 not accrued
    expect(result.gaonFreezeDeduction).toBe(4500);
    expect(result.finalPayout).toBe(4500);
  });

  it("computes the full dynamic formula together", () => {
    const result = calculateMonthlySettlement({
      baseSalary: 8000,
      totalDaysInMonth: 30,
      attendance: { presentDays: 26, halfDays: 1, absentDays: 2, paidLeaveDays: 1, gaonDays: 0 },
      loanEmiDue: 500,
      loanEmiSkipRequested: false,
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
