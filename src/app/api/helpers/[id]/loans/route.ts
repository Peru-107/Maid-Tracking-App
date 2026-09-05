import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEmployerSession, requireOwnedHelper, handleApiError } from "@/lib/guards";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const loans = await prisma.loanEntry.findMany({
      where: { helperId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ loans });
  } catch (error) {
    return handleApiError(error);
  }
}

const postSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().max(280).optional(),
  monthlyEmi: z.number().positive(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Amount and monthly deduction (EMI) are required" },
        { status: 400 },
      );
    }
    if (parsed.data.monthlyEmi > parsed.data.amount) {
      return NextResponse.json(
        { error: "Monthly deduction cannot be more than the loan amount" },
        { status: 400 },
      );
    }

    const loan = await prisma.loanEntry.create({
      data: {
        helperId: id,
        amount: parsed.data.amount,
        reason: parsed.data.reason,
        monthlyEmi: parsed.data.monthlyEmi,
        remainingPrincipal: parsed.data.amount,
      },
    });

    return NextResponse.json({ loan }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
