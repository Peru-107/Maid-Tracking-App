import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployerSession, requireOwnedHelper, handleApiError, HttpError } from "@/lib/guards";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; kharchaId: string }> },
) {
  try {
    const session = await requireEmployerSession();
    const { id, kharchaId } = await params;
    await requireOwnedHelper(id, session.userId);

    const kharcha = await prisma.kharchaEntry.findUnique({ where: { id: kharchaId } });
    if (!kharcha || kharcha.helperId !== id) {
      throw new HttpError(404, "Entry not found");
    }
    if (kharcha.settled) {
      throw new HttpError(409, "This advance has already been settled and can't be deleted");
    }

    await prisma.kharchaEntry.delete({ where: { id: kharchaId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
