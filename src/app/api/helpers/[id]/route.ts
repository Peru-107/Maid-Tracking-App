import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEmployerSession, requireOwnedHelper, handleApiError } from "@/lib/guards";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const helper = await prisma.helperProfile.findUnique({
      where: { id },
      include: {
        loans: { orderBy: { createdAt: "desc" } },
        kharchas: { where: { settled: false }, orderBy: { date: "desc" } },
        settlements: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
        gaonPeriods: { where: { endDate: null } },
      },
    });

    return NextResponse.json({ helper });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  baseMonthlySalary: z.number().positive().optional(),
  active: z.boolean().optional(),
  gaonMode: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    const helper = await requireOwnedHelper(id, session.userId);

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }

    const { gaonMode, ...rest } = parsed.data;

    await prisma.$transaction(async (tx) => {
      if (gaonMode !== undefined && gaonMode !== helper.gaonMode) {
        if (gaonMode) {
          await tx.gaonPeriod.create({ data: { helperId: id, startDate: new Date() } });
        } else {
          const open = await tx.gaonPeriod.findFirst({
            where: { helperId: id, endDate: null },
            orderBy: { startDate: "desc" },
          });
          if (open) {
            await tx.gaonPeriod.update({ where: { id: open.id }, data: { endDate: new Date() } });
          }
        }
      }

      await tx.helperProfile.update({
        where: { id },
        data: {
          ...rest,
          ...(gaonMode !== undefined
            ? { gaonMode, gaonSince: gaonMode ? new Date() : null }
            : {}),
        },
      });
    });

    const updated = await prisma.helperProfile.findUnique({ where: { id } });
    return NextResponse.json({ helper: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
