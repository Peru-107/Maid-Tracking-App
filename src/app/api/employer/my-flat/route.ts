import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEmployerSession, handleApiError } from "@/lib/guards";

// An admin who also lives in the society links themselves to a flat via a
// ResidentProfile where employerId === userId === their own id. This never
// goes through the normal resident phone-uniqueness checks (their phone is
// already their own EMPLOYER account) and is excluded from the general
// Residents management list -- it's purely a personal "my flat" view.
export async function GET() {
  try {
    const session = await requireEmployerSession();

    const residentProfile = await prisma.residentProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!residentProfile) {
      return NextResponse.json({ flatNumber: null, entries: [] });
    }

    const entries = await prisma.visitorEntry.findMany({
      where: { employerId: session.userId, flatNumber: residentProfile.flatNumber },
      orderBy: { entryTime: "desc" },
      take: 200,
    });

    return NextResponse.json({ flatNumber: residentProfile.flatNumber, entries });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  flatNumber: z.string().trim().min(1).max(20),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireEmployerSession();
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Flat number is required" }, { status: 400 });
    }

    const admin = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

    const residentProfile = await prisma.residentProfile.upsert({
      where: { userId: session.userId },
      create: {
        employerId: session.userId,
        userId: session.userId,
        name: admin.name ?? "",
        phone: admin.phone,
        flatNumber: parsed.data.flatNumber,
      },
      update: { flatNumber: parsed.data.flatNumber },
    });

    return NextResponse.json({ flatNumber: residentProfile.flatNumber });
  } catch (error) {
    return handleApiError(error);
  }
}
