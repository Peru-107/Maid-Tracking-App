import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { requireEmployerSession, assertPhoneAvailableForHelper, handleApiError } from "@/lib/guards";

export async function GET() {
  try {
    const session = await requireEmployerSession();
    const helpers = await prisma.helperProfile.findMany({
      where: { employerId: session.userId },
      orderBy: { createdAt: "asc" },
      include: {
        loans: { where: { closed: false } },
        settlements: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 1 },
      },
    });
    return NextResponse.json({ helpers });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string(),
  baseMonthlySalary: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireEmployerSession();
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Name, phone and salary are required" }, { status: 400 });
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number" },
        { status: 400 },
      );
    }

    await assertPhoneAvailableForHelper(phone);

    const helper = await prisma.helperProfile.create({
      data: {
        employerId: session.userId,
        name: parsed.data.name,
        phone,
        baseMonthlySalary: parsed.data.baseMonthlySalary,
      },
    });

    return NextResponse.json({ helper }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
