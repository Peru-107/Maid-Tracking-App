// UPI VPAs look like "name@bank" -- alphanumeric plus a small set of
// separators before the "@", a short alphabetic handle after. This is
// intentionally stricter than the full NPCI spec: better to reject an
// unusual-but-valid VPA and have the employer re-enter it than to persist
// something that isn't actually a payment address.
const VPA_PATTERN = /^[a-zA-Z0-9.\-_]{2,100}@[a-zA-Z][a-zA-Z0-9.]{1,64}$/;

export function isValidVpa(value: string): boolean {
  return VPA_PATTERN.test(value.trim());
}

export function normalizeVpa(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Builds a `upi://pay` deep link. Every field is placed via URLSearchParams
 * rather than string concatenation -- a helper/employer name containing
 * "&" or "=" must never be able to inject or override another query
 * parameter (e.g. smuggling in a different payee VPA or amount).
 */
export function buildUpiPayUrl({
  vpa,
  payeeName,
  amount,
  note,
}: {
  vpa: string;
  payeeName: string;
  amount: number;
  note: string;
}): string {
  if (!isValidVpa(vpa)) {
    throw new Error("Invalid UPI ID");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }

  const params = new URLSearchParams({
    pa: normalizeVpa(vpa),
    pn: payeeName.slice(0, 100),
    am: amount.toFixed(2),
    cu: "INR",
    tn: note.slice(0, 100),
  });

  return `upi://pay?${params.toString()}`;
}
