// Indian digit grouping (1,000 / 10,000 / 1,00,000 / 1,00,00,000) via the
// native en-IN locale, which already implements the lakh/crore rules.
export function formatIndianNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("en-IN");
}

export function rupees(value: number): string {
  return `₹${formatIndianNumber(Math.round(value))}`;
}

// Flat numbers are plain strings, so a lexicographic sort would put "1101"
// before "102". Sorts numerically whenever every value parses as a number
// (true for the floor*100+unit numbering scheme), falling back to a plain
// string compare otherwise.
export function sortFlatNumbers(flatNumbers: string[]): string[] {
  return [...flatNumbers].sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });
}
