import {
  formatZar,
  formatZarCompact,
  formatPercent,
  formatMonthLabel,
  formatDayMonth,
  formatShortDate,
  formatMonthName,
} from '../src/utils/format';

/**
 * These assertions pin the exact strings the app rendered before the formatters
 * were consolidated onto cached Intl instances. en-ZA groups with a space and
 * uses a comma decimal separator, so `R 1 234,50` is correct output, not a bug.
 * If a change to format.ts moves any of these, it is changing every screen, the
 * PDF and the email at once, and that needs to be deliberate.
 */
/** en-ZA groups digits with a non-breaking space, not an ordinary one. */
const NB = ' ';

describe('formatZar', () => {
  it('matches the pre-consolidation output exactly', () => {
    expect(formatZar(1234.5)).toBe(`R 1${NB}234,50`);
    expect(formatZar(0)).toBe('R 0,00');
    expect(formatZar(51200)).toBe(`R 51${NB}200,00`);
    expect(formatZar(-987.65)).toBe('R -987,65');
  });

  it('honours an explicit fraction-digit count', () => {
    expect(formatZar(1234.5, 0)).toBe(`R 1${NB}235`);
    expect(formatZar(4091.1, 0)).toBe(`R 4${NB}091`);
  });
});

describe('formatZarCompact', () => {
  it('renders thousands with a consistent single rule', () => {
    expect(formatZarCompact(51200)).toBe('R 51,2k');
    expect(formatZarCompact(1000)).toBe('R 1,0k');
    expect(formatZarCompact(0)).toBe('R 0');
    expect(formatZarCompact(-4500)).toBe('-R 4,5k');
  });

  it('leaves sub-thousand values un-abbreviated', () => {
    expect(formatZarCompact(728)).toBe('R 728');
  });
});

describe('formatPercent', () => {
  it('uses one decimal by default', () => {
    expect(formatPercent(27.35)).toBe('27,4%');
    expect(formatPercent(100)).toBe('100,0%');
  });

  it('accepts an explicit digit count', () => {
    expect(formatPercent(27.35, 0)).toBe('27%');
  });
});

describe('formatMonthLabel', () => {
  it('is locale-pinned rather than dependent on the host default', () => {
    expect(formatMonthLabel(7, 2026)).toBe('July 2026');
    expect(formatMonthLabel(1, 2026)).toBe('January 2026');
    expect(formatMonthLabel(12, 2025)).toBe('December 2025');
  });
});

describe('date helpers', () => {
  it('formats a day and short month', () => {
    expect(formatDayMonth(new Date(2026, 5, 26))).toBe('26 Jun');
  });

  it('formats a short numeric date', () => {
    // en-ZA orders numeric dates year-first. This matches what the previous
    // inline toLocaleDateString('en-ZA', ...) in TransactionsTab produced.
    expect(formatShortDate(new Date(2026, 5, 26))).toBe('2026/06/26');
  });
});

describe('formatMonthName', () => {
  it('returns the month name without the year', () => {
    expect(formatMonthName(7)).toBe('July');
    expect(formatMonthName(1)).toBe('January');
    expect(formatMonthName(12)).toBe('December');
  });

  it('agrees with the first word of formatMonthLabel across all months', () => {
    for (let m = 1; m <= 12; m++) {
      expect(formatMonthLabel(m, 2026).startsWith(formatMonthName(m))).toBe(true);
    }
  });
});
