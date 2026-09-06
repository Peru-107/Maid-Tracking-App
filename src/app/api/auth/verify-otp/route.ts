import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { verifyOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { handleApiError } from "@/lib/guards";

const bodySchema = z.object({
  phone: z.string(),
  code: z.string().min(4).max(6),
  name: z.string().trim().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const isValid = await verifyOtp(phone, parsed.data.code);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect or expired code" }, { status: 401 });
    }

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // A HelperProfile created by an employer but not yet linked to a login
      // means this phone belongs to a helper signing in for the first time.
      const pendingHelperProfile = await prisma.helperProfile.findFirst({
        where: { phone, userId: null },
      });

      if (pendingHelperProfile) {
        user = await prisma.user.create({
          data: {
            phone,
            name: pendingHelperProfile.name,
            role: "HELPER",
          },
        });
        await prisma.helperProfile.update({
          where: { id: pendingHelperProfile.id },
          data: { userId: user.id },
        });
      } else {
        user = await prisma.user.create({
          data: {
            phone,
            name: parsed.data.name,
            role: "EMPLOYER",
          },
        });
      }
    }

    await createSession({ userId: user.id, role: user.role, phone: user.phone });

    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    return handleApiError(error);
  }
}
