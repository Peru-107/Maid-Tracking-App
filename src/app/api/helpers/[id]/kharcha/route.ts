import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEmployerSession, requireOwnedHelper, handleApiError } from "@/lib/guards";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const kharchas = await prisma.kharchaEntry.findMany({
      where: { helperId: id },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ kharchas });
  } catch (error) {
    return handleApiError(error);
  }
}

const postSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().max(280).optional(),
  date: z.string().optional(), // YYYY-MM-DD, defaults to today
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const date = parsed.data.date ? new Date(`${parsed.data.date}T00:00:00.000Z`) : new Date();

    const kharcha = await prisma.kharchaEntry.create({
      data: {
        helperId: id,
        amount: parsed.data.amount,
        reason: parsed.data.reason,
        date,
      },
    });

    return NextResponse.json({ kharcha }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
