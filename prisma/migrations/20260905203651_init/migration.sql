-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "languagePref" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HelperProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employerId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "baseMonthlySalary" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "gaonMode" BOOLEAN NOT NULL DEFAULT false,
    "gaonSince" DATETIME,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HelperProfile_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HelperProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "helperId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "badli" BOOLEAN NOT NULL DEFAULT false,
    "markedByHelper" BOOLEAN NOT NULL DEFAULT false,
    "approvedByEmployer" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceLog_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "helperId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT,
    "monthlyEmi" REAL NOT NULL,
    "remainingPrincipal" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanEntry_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanEmiEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amountDue" REAL NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "amountPaid" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanEmiEvent_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "LoanEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KharchaEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "helperId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settlementId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KharchaEntry_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KharchaEntry_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "MonthlySettlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlySettlement" (
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
    "finalPayout" REAL NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlySettlement_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OtpCode_phone_idx" ON "OtpCode"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "HelperProfile_userId_key" ON "HelperProfile"("userId");

-- CreateIndex
CREATE INDEX "HelperProfile_employerId_idx" ON "HelperProfile"("employerId");

-- CreateIndex
CREATE INDEX "AttendanceLog_helperId_date_idx" ON "AttendanceLog"("helperId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLog_helperId_date_key" ON "AttendanceLog"("helperId", "date");

-- CreateIndex
CREATE INDEX "LoanEntry_helperId_idx" ON "LoanEntry"("helperId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanEmiEvent_loanId_month_year_key" ON "LoanEmiEvent"("loanId", "month", "year");

-- CreateIndex
CREATE INDEX "KharchaEntry_helperId_idx" ON "KharchaEntry"("helperId");

-- CreateIndex
CREATE INDEX "MonthlySettlement_helperId_idx" ON "MonthlySettlement"("helperId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySettlement_helperId_month_year_key" ON "MonthlySettlement"("helperId", "month", "year");
