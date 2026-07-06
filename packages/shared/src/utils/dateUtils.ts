import type { ITransaction } from '../models/ITransaction';

/**
 * Returns the `{ month (1-12), year }` that the most transactions fall in.
 *
 * Used to infer which month an uploaded statement belongs to, so historical
 * uploads land in the right report regardless of when they are processed.
 *
 * @param useUtc read each date in UTC instead of local time. The analysis
 *   pipeline works in local time (it builds its date range with local
 *   constructors); the persistence layer works in UTC (report dates are stored
 *   as UTC). Callers pick the basis that matches the rest of their maths.
 *
 * @throws if `transactions` is empty — callers should guard against that.
 */
export function dominantMonth(
  transactions: ITransaction[],
  useUtc = false
): { month: number; year: number } {
  const counts = new Map<string, { month: number; year: number; count: number }>();
  for (const t of transactions) {
    const d = new Date(t.Date);
    const m = (useUtc ? d.getUTCMonth() : d.getMonth()) + 1;
    const y = useUtc ? d.getUTCFullYear() : d.getFullYear();
    const key = `${y}-${m}`;
    const entry = counts.get(key) ?? { month: m, year: y, count: 0 };
    counts.set(key, { ...entry, count: entry.count + 1 });
  }
  const winner = [...counts.values()].reduce((a, b) => (b.count > a.count ? b : a));
  return { month: winner.month, year: winner.year };
}
