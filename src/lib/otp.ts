import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 4;

function hashCode(code: string, phone: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

// In production this would call an SMS gateway (e.g. MSG91, Twilio Verify).
// No such provider is wired up here, so the code is returned to the caller
// so the UI can display it in a "Dev Mode OTP" banner instead of sending a
// real SMS. Swap sendSms() below for a real integration to go live.
async function sendSms(phone: string, code: string) {
  console.log(`[dev-otp] SMS to ${phone}: your OTP is ${code}`);
}

export async function requestOtp(phone: string): Promise<{ devCode?: string }> {
  const code = randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");

  await prisma.otpCode.create({
    data: {
      phone,
      codeHash: hashCode(code, phone),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  await sendSms(phone, code);

  const isDev = process.env.NODE_ENV !== "production";
  return isDev ? { devCode: code } : {};
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const candidate = await prisma.otpCode.findFirst({
    where: {
      phone,
      consumed: false,
      expiresAt: { gt: new Date() },
      codeHash: hashCode(code, phone),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!candidate) return false;

  await prisma.otpCode.update({
    where: { id: candidate.id },
    data: { consumed: true },
  });

  return true;
}
