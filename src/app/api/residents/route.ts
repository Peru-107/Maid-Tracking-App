import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { requireEmployerSession, assertPhoneAvailableForResident, handleApiError } from "@/lib/guards";

export async function GET() {
  try {
    const session = await requireEmployerSession();
    const residents = await prisma.residentProfile.findMany({
      where: { employerId: session.userId },
      orderBy: { flatNumber: "asc" },
    });
    return NextResponse.json({ residents });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string(),
  flatNumber: z.string().trim().min(1).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireEmployerSession();
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Name, phone and flat number are required" }, { status: 400 });
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number" },
        { status: 400 },
      );
    }

    await assertPhoneAvailableForResident(phone);

    const resident = await prisma.residentProfile.create({
      data: {
        employerId: session.userId,
        name: parsed.data.name,
        phone,
        flatNumber: parsed.data.flatNumber,
      },
    });

    return NextResponse.json({ resident }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
