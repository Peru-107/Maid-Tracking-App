import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEmployerSession, handleApiError } from "@/lib/guards";

const purposeEnum = z.enum(["GUEST", "DELIVERY", "CAB", "VENDOR", "STAFF", "OTHER"]);

export async function GET(request: NextRequest) {
  try {
    const session = await requireEmployerSession();
    const { searchParams } = new URL(request.url);
    const flatNumber = searchParams.get("flatNumber");
    const purpose = searchParams.get("purpose");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: {
      employerId: string;
      flatNumber?: string;
      purpose?: z.infer<typeof purposeEnum>;
      entryTime?: { gte?: Date; lte?: Date };
    } = { employerId: session.userId };

    if (flatNumber) where.flatNumber = flatNumber;
    if (purpose && purposeEnum.safeParse(purpose).success) {
      where.purpose = purpose as z.infer<typeof purposeEnum>;
    }
    if (from || to) {
      where.entryTime = {};
      if (from) where.entryTime.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) where.entryTime.lte = new Date(`${to}T23:59:59.999Z`);
    }

    const entries = await prisma.visitorEntry.findMany({
      where,
      orderBy: { entryTime: "desc" },
      take: 200,
      include: { loggedBy: { select: { name: true } } },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    return handleApiError(error);
  }
}

// Lets the admin log an entry directly (e.g. backfilling one the watchman
// missed). Watchmen log their own via /api/me/visitor-entries.
const createSchema = z.object({
  flatNumber: z.string().trim().min(1).max(20),
  visitorName: z.string().trim().min(1).max(100),
  purpose: purposeEnum,
  note: z.string().trim().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireEmployerSession();
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Flat, visitor name and purpose are required" }, { status: 400 });
    }

    const entry = await prisma.visitorEntry.create({
      data: {
        employerId: session.userId,
        flatNumber: parsed.data.flatNumber,
        visitorName: parsed.data.visitorName,
        purpose: parsed.data.purpose,
        note: parsed.data.purpose === "OTHER" ? parsed.data.note : undefined,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
