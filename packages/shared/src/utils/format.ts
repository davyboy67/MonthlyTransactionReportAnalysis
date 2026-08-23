/*
 * Locale is pinned to en-ZA explicitly
 */

const LOCALE = 'en-ZA';

const zarFormatters = new Map<number, Intl.NumberFormat>();

function zarFormatter(fractionDigits: number): Intl.NumberFormat {
  let formatter = zarFormatters.get(fractionDigits);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    zarFormatters.set(fractionDigits, formatter);
  }
  return formatter;
}

export function formatZar(value: number, fractionDigits = 2): string {
  return `R ${zarFormatter(fractionDigits).format(value)}`;
}

export function formatZarCompact(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs < 1000) return `${sign}R ${zarFormatter(0).format(abs)}`;
  return `${sign}R ${zarFormatter(1).format(abs / 1000)}k`;
}

const percentFormatters = new Map<number, Intl.NumberFormat>();

export function formatPercent(value: number, digits = 1): string {
  let formatter = percentFormatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    percentFormatters.set(digits, formatter);
  }
  return `${formatter.format(value)}%`;
}

const monthLabelFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
});

export function formatMonthLabel(month: number, year: number): string {
  return monthLabelFormatter.format(new Date(year, month - 1, 1));
}

const monthShortFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  year: '2-digit',
});

export function formatMonthShort(date: Date | string): string {
  return monthShortFormatter.format(new Date(date));
}

const dayMonthFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
});

export function formatDayMonth(date: Date | string): string {
  return dayMonthFormatter.format(new Date(date));
}

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatShortDate(date: Date | string): string {
  return shortDateFormatter.format(new Date(date));
}

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatLongDate(date: Date | string): string {
  return longDateFormatter.format(new Date(date));
}

const monthNameFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'long' });

export function formatMonthName(month: number): string {
  return monthNameFormatter.format(new Date(2000, month - 1, 1));
}
