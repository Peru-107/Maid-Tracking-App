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
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }

    const updated = await prisma.helperProfile.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ helper: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
