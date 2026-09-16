import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEmployerSession, handleApiError } from "@/lib/guards";

// Pre-registers flat numbers before the actual resident's phone is known --
// e.g. setting up every unit in a wing at once. Each row is created with no
// phone/login; the admin fills in the real resident's name and phone later
// via the normal edit form once they're ready to onboard that flat.
const createSchema = z.object({
  flatNumbers: z.array(z.string().trim().min(1).max(20)).min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireEmployerSession();
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "A list of flat numbers is required" }, { status: 400 });
    }

    const requested = [...new Set(parsed.data.flatNumbers)];

    const existing = await prisma.residentProfile.findMany({
      where: { employerId: session.userId, flatNumber: { in: requested } },
      select: { flatNumber: true },
    });
    const existingSet = new Set(existing.map((r) => r.flatNumber));
    const toCreate = requested.filter((flat) => !existingSet.has(flat));

    if (toCreate.length > 0) {
      await prisma.residentProfile.createMany({
        data: toCreate.map((flatNumber) => ({
          employerId: session.userId,
          name: flatNumber,
          phone: null,
          flatNumber,
        })),
      });
    }

    return NextResponse.json({ created: toCreate.length, skipped: existingSet.size }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
