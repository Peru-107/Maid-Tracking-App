import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEmployerSession, requireOwnedHelper, handleApiError, HttpError } from "@/lib/guards";
import { buildSettlementDraft, markSettlementPaid, saveSettlementDraft } from "@/lib/settlement";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    if (!year || !month) {
      return NextResponse.json({ error: "year and month are required" }, { status: 400 });
    }

    const existing = await prisma.monthlySettlement.findUnique({
      where: { helperId_month_year: { helperId: id, month, year } },
    });

    const overrides = existing
      ? {
          loanEmiSkipRequested: existing.loanEmiSkipped,
          overtimeBonus: existing.overtimeBonus,
          festivalBonus: existing.festivalBonus,
        }
      : {};

    const { input, result, loans, kharchaEntries } = await buildSettlementDraft(
      id,
      year,
      month,
      overrides,
    );

    return NextResponse.json({ existing, draft: { input, result }, loans, kharchaEntries });
  } catch (error) {
    return handleApiError(error);
  }
}

const postSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  loanEmiSkipRequested: z.boolean().optional(),
  overtimeBonus: z.number().min(0).optional(),
  festivalBonus: z.number().min(0).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "year and month are required" }, { status: 400 });
    }

    const existing = await prisma.monthlySettlement.findUnique({
      where: {
        helperId_month_year: { helperId: id, month: parsed.data.month, year: parsed.data.year },
      },
    });
    if (existing?.paid) {
      return NextResponse.json({ error: "This month is already settled" }, { status: 409 });
    }

    const settlement = await saveSettlementDraft(id, parsed.data.year, parsed.data.month, {
      loanEmiSkipRequested: parsed.data.loanEmiSkipRequested,
      overtimeBonus: parsed.data.overtimeBonus,
      festivalBonus: parsed.data.festivalBonus,
    });

    return NextResponse.json({ settlement });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({ settlementId: z.string() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "settlementId is required" }, { status: 400 });
    }

    const settlement = await prisma.monthlySettlement.findUnique({
      where: { id: parsed.data.settlementId },
    });
    if (!settlement || settlement.helperId !== id) {
      throw new HttpError(404, "Settlement not found");
    }

    const paidSettlement = await markSettlementPaid(settlement.id);
    return NextResponse.json({ settlement: paidSettlement });
  } catch (error) {
    return handleApiError(error);
  }
}
