/**
 * Shared display formatting helpers. Kept in `shared` so the frontend, the PDF
 * builder, the charts and the email all render money and month labels the same way.
 */

/** Formats a number as ZAR, e.g. `formatZar(1234.5)` -> "R 1,234.50". */
export function formatZar(value: number, fractionDigits = 2): string {
  return `R ${value.toLocaleString('en-ZA', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/** Long month + year label for a 1-based month, e.g. `formatMonthLabel(1, 2026)` -> "January 2026". */
export function formatMonthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
}
