import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n";

const bodySchema = z.object({ locale: z.string() });

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isLocale(parsed.data.locale)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { languagePref: parsed.data.locale },
  });

  return NextResponse.json({ ok: true });
}
