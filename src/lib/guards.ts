import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireEmployerSession() {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Not signed in");
  if (session.role !== "EMPLOYER") throw new HttpError(403, "Employer access only");
  return session;
}

export async function requireOwnedHelper(helperId: string, employerId: string) {
  const helper = await prisma.helperProfile.findUnique({ where: { id: helperId } });
  if (!helper || helper.employerId !== employerId) {
    throw new HttpError(404, "Helper not found");
  }
  return helper;
}

/**
 * A phone number can only ever be one identity in the system -- either the
 * employer's own login, or one specific helper's. Throws before a helper
 * is created/edited with a number that's already spoken for elsewhere.
 */
export async function assertPhoneAvailableForHelper(phone: string, excludeHelperId?: string) {
  const existingUser = await prisma.user.findUnique({ where: { phone } });
  if (existingUser) {
    if (existingUser.role === "EMPLOYER") {
      throw new HttpError(409, "This number is already registered as an employer account");
    }
    const linkedProfile = await prisma.helperProfile.findUnique({ where: { userId: existingUser.id } });
    if (linkedProfile && linkedProfile.id !== excludeHelperId) {
      throw new HttpError(409, "This number is already registered to another helper");
    }
  }

  const duplicateProfile = await prisma.helperProfile.findFirst({
    where: { phone, ...(excludeHelperId ? { id: { not: excludeHelperId } } : {}) },
  });
  if (duplicateProfile) {
    throw new HttpError(409, "This number is already added as a helper");
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
