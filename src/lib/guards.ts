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

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
