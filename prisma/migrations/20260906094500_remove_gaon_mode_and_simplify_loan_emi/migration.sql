-- DropForeignKey
ALTER TABLE "GaonPeriod" DROP CONSTRAINT "GaonPeriod_helperId_fkey";

-- DropTable
DROP TABLE "GaonPeriod";

-- AlterTable
ALTER TABLE "HelperProfile" DROP COLUMN "gaonMode",
DROP COLUMN "gaonSince";

-- AlterTable
ALTER TABLE "MonthlySettlement" DROP COLUMN "loanEmiSkipped",
DROP COLUMN "gaonModeActive",
DROP COLUMN "gaonDays",
DROP COLUMN "gaonFreezeDeduction";
