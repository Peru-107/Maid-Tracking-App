import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HelperWorkspace } from "@/components/employer/helper-workspace";
import { DeleteHelperButton } from "@/components/employer/delete-helper-button";

export default async function HelperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const helper = await prisma.helperProfile.findUnique({
    where: { id },
    include: {
      loans: { orderBy: { createdAt: "desc" } },
      kharchas: { where: { settled: false }, orderBy: { date: "desc" } },
    },
  });

  if (!helper || helper.employerId !== session!.userId) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/employer" className="text-sm text-teal-700 hover:underline dark:text-teal-400">
          ← All Helpers
        </Link>
        <h1 className="mt-1 text-xl font-bold">{helper.name}</h1>
        <p className="text-sm text-neutral-500">
          +91 {helper.phone.replace("+91", "")} · Base Salary ₹{helper.baseMonthlySalary.toLocaleString("en-IN")}/mo
        </p>
      </div>

      <HelperWorkspace
        helperId={helper.id}
        helperName={helper.name}
        helperPhone={helper.phone}
        loans={helper.loans}
        kharchas={helper.kharchas}
      />

      <div className="mt-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <DeleteHelperButton helperId={helper.id} helperName={helper.name} />
      </div>
    </div>
  );
}
