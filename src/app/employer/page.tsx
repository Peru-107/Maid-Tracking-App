import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { AddHelperForm } from "@/components/employer/add-helper-form";

export default async function EmployerDashboard() {
  const session = await getSession();
  const helpers = await prisma.helperProfile.findMany({
    where: { employerId: session!.userId },
    orderBy: { createdAt: "asc" },
    include: {
      loans: { where: { closed: false } },
      settlements: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 1 },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Your Helpers</h1>
        <AddHelperForm />
      </div>

      {helpers.length === 0 ? (
        <Card className="p-8 text-center text-neutral-500">
          No helpers added yet. Add your first helper to start tracking attendance and salary.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {helpers.map((helper) => {
            const outstandingLoan = helper.loans.reduce((sum, l) => sum + l.remainingPrincipal, 0);
            const lastSettlement = helper.settlements[0];
            return (
              <Link key={helper.id} href={`/employer/helpers/${helper.id}`}>
                <Card className="flex h-full flex-col gap-2 p-4 transition hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{helper.name}</h2>
                      <p className="text-sm text-neutral-500">+91 {helper.phone.replace("+91", "")}</p>
                    </div>
                    {helper.gaonMode && <Badge tone="blue">On Village Leave</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <div>
                      <div className="text-neutral-500">Base Salary</div>
                      <div className="font-semibold">₹{helper.baseMonthlySalary.toLocaleString("en-IN")}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500">Loan Balance</div>
                      <div className="font-semibold">
                        {outstandingLoan > 0 ? `₹${outstandingLoan.toLocaleString("en-IN")}` : "None"}
                      </div>
                    </div>
                    {lastSettlement && (
                      <div>
                        <div className="text-neutral-500">Last Settlement</div>
                        <Badge tone={lastSettlement.paid ? "green" : "yellow"}>
                          {lastSettlement.paid ? "Paid" : "Pending"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
