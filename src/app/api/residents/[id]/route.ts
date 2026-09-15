import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import {
  requireEmployerSession,
  requireOwnedResident,
  assertPhoneAvailableForResident,
  handleApiError,
} from "@/lib/guards";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().optional(),
  flatNumber: z.string().trim().min(1).max(20).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedResident(id, session.userId);

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }

    const data: { name?: string; phone?: string; flatNumber?: string; active?: boolean } = {
      name: parsed.data.name,
      flatNumber: parsed.data.flatNumber,
      active: parsed.data.active,
    };

    if (parsed.data.phone !== undefined) {
      const phone = normalizePhone(parsed.data.phone);
      if (!phone) {
        return NextResponse.json(
          { error: "Enter a valid 10-digit Indian mobile number" },
          { status: 400 },
        );
      }
      await assertPhoneAvailableForResident(phone, id);
      data.phone = phone;
    }

    const updated = await prisma.residentProfile.update({ where: { id }, data });
    return NextResponse.json({ resident: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedResident(id, session.userId);

    // Gate log history for their flat is untouched -- VisitorEntry.flatNumber
    // is a plain string, not an FK, so it survives the resident record.
    await prisma.residentProfile.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
