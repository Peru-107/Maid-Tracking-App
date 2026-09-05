import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { endOfMonth, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireEmployerSession, requireOwnedHelper, handleApiError } from "@/lib/guards";

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

    const start = startOfMonth(new Date(year, month - 1, 1));
    const end = endOfMonth(start);

    const logs = await prisma.attendanceLog.findMany({
      where: { helperId: id, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return handleApiError(error);
  }
}

const statusEnum = z.enum(["PRESENT", "ABSENT", "HALF_DAY", "PAID_LEAVE"]);

const postSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  status: statusEnum,
  badli: z.boolean().optional(),
  note: z.string().max(280).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "date and status are required" }, { status: 400 });
    }

    const date = new Date(`${parsed.data.date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const log = await prisma.attendanceLog.upsert({
      where: { helperId_date: { helperId: id, date } },
      create: {
        helperId: id,
        date,
        status: parsed.data.status,
        badli: parsed.data.badli ?? false,
        note: parsed.data.note,
        approvedByEmployer: true,
      },
      update: {
        status: parsed.data.status,
        badli: parsed.data.badli ?? false,
        note: parsed.data.note,
        approvedByEmployer: true,
      },
    });

    return NextResponse.json({ log });
  } catch (error) {
    return handleApiError(error);
  }
}
