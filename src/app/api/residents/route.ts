import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { requireEmployerSession, assertPhoneAvailableForResident, handleApiError } from "@/lib/guards";

export async function GET() {
  try {
    const session = await requireEmployerSession();
    const residents = await prisma.residentProfile.findMany({
      // Excludes the admin's own self-linked "My Flat" profile (userId ===
      // their own id) -- that's a personal view, not someone to manage.
      // NOT: { userId: x } would also silently exclude every placeholder
      // row with userId IS NULL (SQL's three-valued logic treats
      // "NULL = x" as unknown, and NOT of unknown is still unknown, which
      // WHERE discards) -- the explicit OR keeps those.
      where: {
        employerId: session.userId,
        OR: [{ userId: null }, { userId: { not: session.userId } }],
      },
    });
    // flatNumber is a plain string -- sort numerically (101, 102, ... 1104)
    // rather than lexicographically (1101 before 102).
    residents.sort((a, b) => {
      const numA = Number(a.flatNumber);
      const numB = Number(b.flatNumber);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
      return a.flatNumber.localeCompare(b.flatNumber);
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
