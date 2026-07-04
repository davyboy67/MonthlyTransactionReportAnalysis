/**
 * Value-parsing helpers for bank statement cells. Bank exports disagree on
 * date order, thousands separators, and how negatives are written, so parsers
 * share these instead of trusting `new Date()` / `parseFloat` directly.
 */

const ISO_DATE = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
// SA statements are day-first: 10/02/2026 means 10 February
const DAY_FIRST_DATE = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
const DAY_MONTH_NAME_DATE = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/;

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse a statement date cell. Supports ISO (2026-02-10, 2026/02/10),
 * day-first (10/02/2026, 10-02-2026), and "10 Feb 2026" forms.
 * Returns null when the cell is not a date (metadata/footer rows).
 */
export function parseStatementDate(raw: string | undefined): Date | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim();

  let year: number, month: number, day: number;

  let match = value.match(ISO_DATE);
  if (match) {
    [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  } else if ((match = value.match(DAY_FIRST_DATE))) {
    [day, month, year] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  } else if ((match = value.match(DAY_MONTH_NAME_DATE))) {
    const monthIndex = MONTHS[match[2].slice(0, 3).toLowerCase()];
    if (monthIndex === undefined) {
      return null;
    }
    [day, month, year] = [Number(match[1]), monthIndex, Number(match[3])];
  } else {
    return null;
  }

  const date = new Date(year, month, day);
  // reject overflowed components, e.g. 31/02/2026
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * Parse a statement amount cell. Handles "R 1 234.56", "1,234.56",
 * "1234,56" (decimal comma), "(250.00)" and "250.00 Dr" negatives,
 * and "250.00 Cr" credits. Returns NaN when not numeric.
 */
export function parseAmount(raw: string | undefined): number {
  if (!raw) {
    return NaN;
  }
  let value = raw.replace(/[\s]/g, "");
  let sign = 1;

  if (/cr$/i.test(value)) {
    value = value.slice(0, -2);
  } else if (/dr$/i.test(value)) {
    value = value.slice(0, -2);
    sign = -1;
  }
  if (value.startsWith("(") && value.endsWith(")")) {
    value = value.slice(1, -1);
    sign = -1;
  }
  value = value.replace(/^R/i, "");

  const hasComma = value.includes(",");
  if (hasComma && value.includes(".")) {
    value = value.replace(/,/g, ""); // 1,234.56 -> comma is thousands
  } else if (hasComma) {
    const lastComma = value.lastIndexOf(",");
    const digitsAfter = value.length - lastComma - 1;
    if (digitsAfter > 0 && digitsAfter <= 2) {
      // 1234,56 -> comma is the decimal separator
      value = `${value.slice(0, lastComma)}.${value.slice(lastComma + 1)}`;
    }
    value = value.replace(/,/g, "");
  }

  if (!/^[-+]?\d+(\.\d+)?$/.test(value)) {
    return NaN;
  }
  return Number(value) * sign;
}
