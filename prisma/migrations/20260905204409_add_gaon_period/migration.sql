-- CreateTable
CREATE TABLE "GaonPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "helperId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GaonPeriod_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "HelperProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GaonPeriod_helperId_idx" ON "GaonPeriod"("helperId");
