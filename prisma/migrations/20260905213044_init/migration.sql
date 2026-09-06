-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYER', 'HELPER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'PAID_LEAVE');

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL,
    "languagePref" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelperProfile" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "baseMonthlySalary" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "gaonMode" BOOLEAN NOT NULL DEFAULT false,
    "gaonSince" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelperProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GaonPeriod" (
    "id" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GaonPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "badli" BOOLEAN NOT NULL DEFAULT false,
    "markedByHelper" BOOLEAN NOT NULL DEFAULT false,
    "approvedByEmployer" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanEntry" (
    "id" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "monthlyEmi" DOUBLE PRECISION NOT NULL,
    "remainingPrincipal" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanEmiEvent" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanEmiEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KharchaEntry" (
    "id" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settlementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KharchaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySettlement" (
    "id" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "totalDaysInMonth" INTEGER NOT NULL,
    "presentDays" DOUBLE PRECISION NOT NULL,
    "absentDays" DOUBLE PRECISION NOT NULL,
    "halfDays" DOUBLE PRECISION NOT NULL,
    "paidLeaveDays" DOUBLE PRECISION NOT NULL,
    "perDayWage" DOUBLE PRECISION NOT NULL,
    "lossOfPay" DOUBLE PRECISION NOT NULL,
    "loanEmiDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loanEmiSkipped" BOOLEAN NOT NULL DEFAULT false,
    "loanEmiDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kharchaDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "festivalBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gaonModeActive" BOOLEAN NOT NULL DEFAULT false,
    "gaonDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gaonFreezeDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalPayout" DOUBLE PRECISION NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlySettlement_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "GaonPeriod_helperId_idx" ON "GaonPeriod"("helperId");

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

-- AddForeignKey
ALTER TABLE "HelperProfile" ADD CONSTRAINT "HelperProfile_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelperProfile" ADD CONSTRAINT "HelperProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GaonPeriod" ADD CONSTRAINT "GaonPeriod_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanEntry" ADD CONSTRAINT "LoanEntry_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanEmiEvent" ADD CONSTRAINT "LoanEmiEvent_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "LoanEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KharchaEntry" ADD CONSTRAINT "KharchaEntry_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KharchaEntry" ADD CONSTRAINT "KharchaEntry_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "MonthlySettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySettlement" ADD CONSTRAINT "MonthlySettlement_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
