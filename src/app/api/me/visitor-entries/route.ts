import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sortFlatNumbers } from "@/lib/format";

async function getOwnWatchmanProfile() {
  const session = await getSession();
  if (!session || session.role !== "HELPER") return null;
  const profile = await prisma.helperProfile.findUnique({ where: { userId: session.userId } });
  if (!profile || profile.category !== "WATCHMAN") return null;
  return profile;
}

export async function GET() {
  const profile = await getOwnWatchmanProfile();
  if (!profile) {
    return NextResponse.json({ error: "Watchman login required" }, { status: 403 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [entries, residents] = await Promise.all([
    prisma.visitorEntry.findMany({
      where: { employerId: profile.employerId, entryTime: { gte: todayStart } },
      orderBy: { entryTime: "desc" },
    }),
    prisma.residentProfile.findMany({
      where: { employerId: profile.employerId },
      select: { flatNumber: true },
    }),
  ]);

  const flatNumbers = sortFlatNumbers([...new Set(residents.map((r) => r.flatNumber))]);

  return NextResponse.json({ entries, flatNumbers });
}

const purposeEnum = z.enum(["GUEST", "DELIVERY", "CAB", "VENDOR", "STAFF", "OTHER"]);

const createSchema = z.object({
  flatNumber: z.string().trim().min(1).max(20),
  visitorName: z.string().trim().min(1).max(100),
  purpose: purposeEnum,
});

export async function POST(request: NextRequest) {
  const profile = await getOwnWatchmanProfile();
  if (!profile) {
    return NextResponse.json({ error: "Watchman login required" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Flat, visitor name and purpose are required" }, { status: 400 });
  }

  const entry = await prisma.visitorEntry.create({
    data: {
      employerId: profile.employerId,
      flatNumber: parsed.data.flatNumber,
      visitorName: parsed.data.visitorName,
      purpose: parsed.data.purpose,
      loggedById: profile.id,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
