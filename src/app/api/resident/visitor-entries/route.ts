import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnResidentProfile() {
  const session = await getSession();
  if (!session || session.role !== "RESIDENT") return null;
  return prisma.residentProfile.findUnique({ where: { userId: session.userId } });
}

export async function GET(request: NextRequest) {
  const profile = await getOwnResidentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Resident login required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: { employerId: string; flatNumber: string; entryTime?: { gte?: Date; lte?: Date } } = {
    employerId: profile.employerId,
    flatNumber: profile.flatNumber,
  };
  if (from || to) {
    where.entryTime = {};
    if (from) where.entryTime.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) where.entryTime.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const entries = await prisma.visitorEntry.findMany({
    where,
    orderBy: { entryTime: "desc" },
    take: 200,
  });

  return NextResponse.json({ entries });
}
