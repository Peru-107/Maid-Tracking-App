import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { isValidVpa, normalizeVpa } from "@/lib/upi";
import {
  requireEmployerSession,
  requireOwnedHelper,
  assertPhoneAvailableForHelper,
  handleApiError,
} from "@/lib/guards";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const helper = await prisma.helperProfile.findUnique({
      where: { id },
      include: {
        loans: { orderBy: { createdAt: "desc" } },
        kharchas: { where: { settled: false }, orderBy: { date: "desc" } },
        settlements: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
      },
    });

    return NextResponse.json({ helper });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().optional(),
  baseMonthlySalary: z.number().positive().optional(),
  active: z.boolean().optional(),
  // Empty string clears a previously-set UPI ID.
  upiId: z.string().trim().max(100).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEmployerSession();
    const { id } = await params;
    await requireOwnedHelper(id, session.userId);

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }

    const data: {
      name?: string;
      phone?: string;
      baseMonthlySalary?: number;
      active?: boolean;
      upiId?: string | null;
    } = {
      baseMonthlySalary: parsed.data.baseMonthlySalary,
      active: parsed.data.active,
      name: parsed.data.name,
    };

    if (parsed.data.phone !== undefined) {
      const phone = normalizePhone(parsed.data.phone);
      if (!phone) {
        return NextResponse.json(
          { error: "Enter a valid 10-digit Indian mobile number" },
          { status: 400 },
        );
      }
      await assertPhoneAvailableForHelper(phone, id);
      data.phone = phone;
    }

    if (parsed.data.upiId !== undefined) {
      if (parsed.data.upiId === "") {
        data.upiId = null;
      } else if (!isValidVpa(parsed.data.upiId)) {
        return NextResponse.json(
          { error: "Enter a valid UPI ID, e.g. name@bank" },
          { status: 400 },
        );
      } else {
        data.upiId = normalizeVpa(parsed.data.upiId);
      }
    }

    const updated = await prisma.helperProfile.update({ where: { id }, data });
    return NextResponse.json({ helper: updated });
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
    await requireOwnedHelper(id, session.userId);

    // Cascades to their attendance, loans, kharcha, and settlements
    // (onDelete: Cascade in schema.prisma) -- their login, if any, is kept
    // but no longer linked to a profile.
    await prisma.helperProfile.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
