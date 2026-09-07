// Indian digit grouping (1,000 / 10,000 / 1,00,000 / 1,00,00,000) via the
// native en-IN locale, which already implements the lakh/crore rules.
export function formatIndianNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("en-IN");
}

export function rupees(value: number): string {
  return `₹${formatIndianNumber(Math.round(value))}`;
}
