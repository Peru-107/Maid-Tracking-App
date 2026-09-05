import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employer = await prisma.user.upsert({
    where: { phone: "+919876543210" },
    update: {},
    create: { phone: "+919876543210", name: "Anita Verma", role: "EMPLOYER" },
  });

  const helper = await prisma.helperProfile.upsert({
    where: { id: "seed-helper-sunita" },
    update: {},
    create: {
      id: "seed-helper-sunita",
      employerId: employer.id,
      name: "Sunita Devi",
      phone: "+918765432109",
      baseMonthlySalary: 9000,
    },
  });

  const now = new Date();
  const daysSoFar = now.getDate() - 1;
  const pattern: Array<"PRESENT" | "ABSENT" | "HALF_DAY" | "PAID_LEAVE"> = [];
  for (let d = 1; d <= daysSoFar; d++) {
    if (d === 5) pattern.push("ABSENT");
    else if (d === 12) pattern.push("HALF_DAY");
    else if (d === 18) pattern.push("PAID_LEAVE");
    else pattern.push("PRESENT");
  }

  for (let d = 1; d <= daysSoFar; d++) {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), d));
    await prisma.attendanceLog.upsert({
      where: { helperId_date: { helperId: helper.id, date } },
      update: {},
      create: {
        helperId: helper.id,
        date,
        status: pattern[d - 1],
        approvedByEmployer: true,
        badli: d === 5,
      },
    });
  }

  const existingLoan = await prisma.loanEntry.findFirst({ where: { helperId: helper.id } });
  if (!existingLoan) {
    await prisma.loanEntry.create({
      data: {
        helperId: helper.id,
        amount: 10000,
        reason: "Medical expense",
        monthlyEmi: 1000,
        remainingPrincipal: 7000, // as if 3 EMIs already paid in prior months
      },
    });
  }

  const existingKharcha = await prisma.kharchaEntry.findFirst({
    where: { helperId: helper.id, settled: false },
  });
  if (!existingKharcha) {
    await prisma.kharchaEntry.create({
      data: {
        helperId: helper.id,
        amount: 500,
        reason: "Ration",
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Employer login: ${employer.phone} (${employer.name})`);
  console.log(`Helper login:   ${helper.phone} (${helper.name}) — first OTP login auto-links this account`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
