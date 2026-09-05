import { NextRequest, NextResponse } from "next/server";
import { endOfMonth, startOfMonth } from "date-fns";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOwnHelperProfile() {
  const session = await getSession();
  if (!session || session.role !== "HELPER") return null;
  return prisma.helperProfile.findUnique({ where: { userId: session.userId } });
}

export async function GET(request: NextRequest) {
  const profile = await getOwnHelperProfile();
  if (!profile) {
    return NextResponse.json({ error: "Helper login required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!year || !month) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }

  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);

  const logs = await prisma.attendanceLog.findMany({
    where: { helperId: profile.id, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ logs });
}

export async function POST() {
  const profile = await getOwnHelperProfile();
  if (!profile) {
    return NextResponse.json({ error: "Helper login required" }, { status: 403 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.attendanceLog.findUnique({
    where: { helperId_date: { helperId: profile.id, date: today } },
  });

  if (existing) {
    return NextResponse.json({ log: existing });
  }

  const log = await prisma.attendanceLog.create({
    data: {
      helperId: profile.id,
      date: today,
      status: "PRESENT",
      markedByHelper: true,
      approvedByEmployer: false,
    },
  });

  return NextResponse.json({ log }, { status: 201 });
}
