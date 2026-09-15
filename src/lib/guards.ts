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

export async function requireOwnedResident(residentId: string, employerId: string) {
  const resident = await prisma.residentProfile.findUnique({ where: { id: residentId } });
  if (!resident || resident.employerId !== employerId) {
    throw new HttpError(404, "Resident not found");
  }
  return resident;
}

export async function requireResidentSession() {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Not signed in");
  if (session.role !== "RESIDENT") throw new HttpError(403, "Resident access only");
  return session;
}

/**
 * A phone number can only ever be one identity in the system -- the
 * employer's own login, one specific helper's, or one specific resident's.
 * Throws before a helper is created/edited with a number that's already
 * spoken for elsewhere.
 */
export async function assertPhoneAvailableForHelper(phone: string, excludeHelperId?: string) {
  const existingUser = await prisma.user.findUnique({ where: { phone } });
  if (existingUser) {
    if (existingUser.role === "EMPLOYER") {
      throw new HttpError(409, "This number is already registered as an employer account");
    }
    if (existingUser.role === "RESIDENT") {
      throw new HttpError(409, "This number is already registered as a resident account");
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

  const duplicateResident = await prisma.residentProfile.findFirst({ where: { phone } });
  if (duplicateResident) {
    throw new HttpError(409, "This number is already added as a resident");
  }
}

/**
 * Same uniqueness rule as assertPhoneAvailableForHelper, mirrored for
 * resident creation/editing.
 */
export async function assertPhoneAvailableForResident(phone: string, excludeResidentId?: string) {
  const existingUser = await prisma.user.findUnique({ where: { phone } });
  if (existingUser) {
    if (existingUser.role === "EMPLOYER") {
      throw new HttpError(409, "This number is already registered as an employer account");
    }
    if (existingUser.role === "HELPER") {
      throw new HttpError(409, "This number is already registered as a helper account");
    }
    const linkedProfile = await prisma.residentProfile.findUnique({ where: { userId: existingUser.id } });
    if (linkedProfile && linkedProfile.id !== excludeResidentId) {
      throw new HttpError(409, "This number is already registered to another resident");
    }
  }

  const duplicateProfile = await prisma.residentProfile.findFirst({
    where: { phone, ...(excludeResidentId ? { id: { not: excludeResidentId } } : {}) },
  });
  if (duplicateProfile) {
    throw new HttpError(409, "This number is already added as a resident");
  }

  const duplicateHelper = await prisma.helperProfile.findFirst({ where: { phone } });
  if (duplicateHelper) {
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
