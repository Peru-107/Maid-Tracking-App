import type { MonthlySettlement } from "@prisma/client";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function buildHisaabMessage(helperName: string, settlement: MonthlySettlement): string {
  const lines = [
    `*${MONTH_NAMES[settlement.month - 1]} ${settlement.year} Hisaab - ${helperName}*`,
    "",
    `Base Salary: ${formatRupees(settlement.baseSalary)}`,
    `Present: ${settlement.presentDays} | Absent: ${settlement.absentDays} | Half-day: ${settlement.halfDays} | Paid Leave: ${settlement.paidLeaveDays}`,
  ];

  if (settlement.lossOfPay > 0) {
    lines.push(`Loss of Pay: -${formatRupees(settlement.lossOfPay)}`);
  }
  if (settlement.loanEmiDue > 0 && settlement.loanEmiDeducted === 0) {
    lines.push(`Loan Repayment: Skipped this month (${formatRupees(settlement.loanEmiDue)} carried forward)`);
  } else if (settlement.loanEmiDeducted > 0) {
    lines.push(`Loan Repayment Deducted: -${formatRupees(settlement.loanEmiDeducted)}`);
  }
  if (settlement.kharchaDeducted > 0) {
    lines.push(`Advance (Kharcha) Deducted: -${formatRupees(settlement.kharchaDeducted)}`);
  }
  if (settlement.overtimeBonus > 0) {
    lines.push(`Extra Work Bonus: +${formatRupees(settlement.overtimeBonus)}`);
  }
  if (settlement.festivalBonus > 0) {
    lines.push(`Festival Bonus: +${formatRupees(settlement.festivalBonus)}`);
  }

  lines.push("", `*Final Payout: ${formatRupees(settlement.finalPayout)}*`);
  lines.push(settlement.paid ? "Status: Paid" : "Status: Not Paid Yet");

  return lines.join("\n");
}

export function buildWhatsAppShareUrl(phoneE164: string, message: string) {
  const digitsOnly = phoneE164.replace(/[^\d]/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}
