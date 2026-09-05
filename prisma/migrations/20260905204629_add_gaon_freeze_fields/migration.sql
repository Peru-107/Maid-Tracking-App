-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MonthlySettlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "helperId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" REAL NOT NULL,
    "totalDaysInMonth" INTEGER NOT NULL,
    "presentDays" REAL NOT NULL,
    "absentDays" REAL NOT NULL,
    "halfDays" REAL NOT NULL,
    "paidLeaveDays" REAL NOT NULL,
    "perDayWage" REAL NOT NULL,
    "lossOfPay" REAL NOT NULL,
    "loanEmiDue" REAL NOT NULL DEFAULT 0,
    "loanEmiSkipped" BOOLEAN NOT NULL DEFAULT false,
    "loanEmiDeducted" REAL NOT NULL DEFAULT 0,
    "kharchaDeducted" REAL NOT NULL DEFAULT 0,
    "overtimeBonus" REAL NOT NULL DEFAULT 0,
    "festivalBonus" REAL NOT NULL DEFAULT 0,
    "gaonModeActive" BOOLEAN NOT NULL DEFAULT false,
    "gaonDays" REAL NOT NULL DEFAULT 0,
    "gaonFreezeDeduction" REAL NOT NULL DEFAULT 0,
    "finalPayout" REAL NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlySettlement_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MonthlySettlement" ("absentDays", "baseSalary", "createdAt", "festivalBonus", "finalPayout", "gaonModeActive", "halfDays", "helperId", "id", "kharchaDeducted", "loanEmiDeducted", "loanEmiDue", "loanEmiSkipped", "lossOfPay", "month", "overtimeBonus", "paid", "paidAt", "paidLeaveDays", "perDayWage", "presentDays", "totalDaysInMonth", "year") SELECT "absentDays", "baseSalary", "createdAt", "festivalBonus", "finalPayout", "gaonModeActive", "halfDays", "helperId", "id", "kharchaDeducted", "loanEmiDeducted", "loanEmiDue", "loanEmiSkipped", "lossOfPay", "month", "overtimeBonus", "paid", "paidAt", "paidLeaveDays", "perDayWage", "presentDays", "totalDaysInMonth", "year" FROM "MonthlySettlement";
DROP TABLE "MonthlySettlement";
ALTER TABLE "new_MonthlySettlement" RENAME TO "MonthlySettlement";
CREATE INDEX "MonthlySettlement_helperId_idx" ON "MonthlySettlement"("helperId");
CREATE UNIQUE INDEX "MonthlySettlement_helperId_month_year_key" ON "MonthlySettlement"("helperId", "month", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
