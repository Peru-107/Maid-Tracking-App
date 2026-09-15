-- CreateEnum
CREATE TYPE "HelperCategory" AS ENUM ('MAID', 'COOK', 'GARDENER', 'GARBAGE_COLLECTOR', 'WATCHMAN');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('DAY', 'NIGHT');

-- CreateEnum
CREATE TYPE "VisitorPurpose" AS ENUM ('GUEST', 'DELIVERY', 'CAB', 'VENDOR', 'STAFF', 'OTHER');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RESIDENT';

-- AlterTable
ALTER TABLE "HelperProfile" ADD COLUMN     "category" "HelperCategory" NOT NULL DEFAULT 'MAID',
ADD COLUMN     "shift" "Shift";

-- CreateTable
CREATE TABLE "ResidentProfile" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "flatNumber" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorEntry" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "flatNumber" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "purpose" "VisitorPurpose" NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loggedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResidentProfile_userId_key" ON "ResidentProfile"("userId");

-- CreateIndex
CREATE INDEX "ResidentProfile_employerId_idx" ON "ResidentProfile"("employerId");

-- CreateIndex
CREATE INDEX "ResidentProfile_employerId_flatNumber_idx" ON "ResidentProfile"("employerId", "flatNumber");

-- CreateIndex
CREATE INDEX "VisitorEntry_employerId_flatNumber_idx" ON "VisitorEntry"("employerId", "flatNumber");

-- CreateIndex
CREATE INDEX "VisitorEntry_employerId_entryTime_idx" ON "VisitorEntry"("employerId", "entryTime");

-- AddForeignKey
ALTER TABLE "ResidentProfile" ADD CONSTRAINT "ResidentProfile_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentProfile" ADD CONSTRAINT "ResidentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorEntry" ADD CONSTRAINT "VisitorEntry_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorEntry" ADD CONSTRAINT "VisitorEntry_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "HelperProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
