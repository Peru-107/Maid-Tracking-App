// Normalizes Indian phone numbers to E.164 (+91XXXXXXXXXX).
// Accepts input with spaces, dashes, a leading 0, or an existing +91/91 prefix.
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");

  let national: string;
  if (digits.length === 10) {
    national = digits;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    national = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    national = digits.slice(2);
  } else {
    return null;
  }

  if (!/^[6-9]\d{9}$/.test(national)) return null;
  return `+91${national}`;
}

export function formatPhoneForDisplay(e164: string): string {
  const national = e164.replace("+91", "");
  return `${national.slice(0, 5)} ${national.slice(5)}`;
}
