import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 4;

function hashCode(code: string, phone: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

// No SMS gateway (e.g. MSG91, Twilio Verify) is wired up yet -- this is not
// specific to local development, so gating on NODE_ENV would hide the code
// on every real deployment too, with no way to log in. Swap sendSms() for a
// real gateway call, and gate SHOW_OTP_ON_SCREEN off once one exists.
const SMS_GATEWAY_CONFIGURED = false;

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

  return SMS_GATEWAY_CONFIGURED ? {} : { devCode: code };
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
