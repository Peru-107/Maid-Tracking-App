import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { requireHelperOwnerSession, assertPhoneAvailableForHelper, handleApiError } from "@/lib/guards";

export async function GET() {
  try {
    const session = await requireHelperOwnerSession();
    const helpers = await prisma.helperProfile.findMany({
      where: { employerId: session.userId },
      orderBy: { createdAt: "asc" },
      include: {
        loans: { where: { closed: false } },
        settlements: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 1 },
      },
    });
    return NextResponse.json({ helpers });
  } catch (error) {
    return handleApiError(error);
  }
}

const categoryEnum = z.enum(["MAID", "COOK", "GARDENER", "GARBAGE_COLLECTOR", "WATCHMAN"]);
const shiftEnum = z.enum(["DAY", "NIGHT"]);

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string(),
  baseMonthlySalary: z.number().positive(),
  category: categoryEnum.optional(),
  shift: shiftEnum.optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireHelperOwnerSession();
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Name, phone and salary are required" }, { status: 400 });
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number" },
        { status: 400 },
      );
    }

    await assertPhoneAvailableForHelper(phone);

    // Residents hire personal household staff only -- Watchman and the
    // other categories are society-level roles the admin manages. Enforced
    // here, not just hidden in the UI, since the category otherwise comes
    // straight from the request body.
    const category = session.role === "RESIDENT" ? "MAID" : (parsed.data.category ?? "MAID");

    const helper = await prisma.helperProfile.create({
      data: {
        employerId: session.userId,
        name: parsed.data.name,
        phone,
        baseMonthlySalary: parsed.data.baseMonthlySalary,
        category,
        // Shift only makes sense for watchmen; drop it silently otherwise
        // rather than surface a validation error for an ignored field.
        shift: category === "WATCHMAN" ? parsed.data.shift : undefined,
      },
    });

    return NextResponse.json({ helper }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
