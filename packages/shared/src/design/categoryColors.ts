import { THEME, type ThemeName } from './tokens';

/**
 * Stable colour assignment for transaction categories.
 *
 * Keyed by name, not by rank: a category must keep its colour across months,
 * across views, and in the PDF, none of which share a sort order.
 *
 * Keys are the `category.name` values seeded in
 * `packages/backend/src/database/migrations/004_create_reference_tables.sql`.
 * Indices point into `THEME[theme].palette`.
 *
 * 14 categories over 8 hues means collisions are unavoidable, so the
 * assignment is ordered by how likely a category is to appear in the Top-5
 * spending chart, which is the only view that shows several categories at once.
 * The eight categories most likely to land in a top five each get their own
 * hue. The remaining six double up, paired with a partner they are unlikely to
 * appear alongside: Income and Savings are filtered out of that chart entirely,
 * and Education, Fees and Miscellaneous are low-volume for most months.
 *
 * If a chart is ever added that plots all 14 at once, it needs a second visual
 * dimension (dash or fill pattern), not more hues.
 */
const CATEGORY_PALETTE_INDEX: Readonly<Record<string, number>> = {
  // Distinct hues: the eight most likely to co-occur in a top five.
  Groceries: 0,
  Transport: 1,
  Utilities: 2,
  Health: 3,
  Entertainment: 4,
  Insurance: 5,
  'Dining Out': 6,
  Shopping: 7,

  // Doubled up: lower-volume, or excluded from the multi-series chart.
  Subscriptions: 1,
  Education: 2,
  Fees: 3,
  Miscellaneous: 7,
  Savings: 0,
  Income: 0,
};

/**
 * Deterministic fallback so a category added to the database later still gets a
 * colour that is consistent across months, views and the PDF, even though it is
 * not in the map above.
 */
function hashToIndex(name: string, buckets: number): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % buckets;
}

export function categoryColorIndex(categoryName: string): number {
  // hasOwnProperty rather than a bare lookup: these names can originate from
  // user CSV data, and a value like "constructor" or "toString" would otherwise
  // resolve to an inherited Function, survive `??`, and index the palette with
  // NaN.
  const mapped = Object.prototype.hasOwnProperty.call(CATEGORY_PALETTE_INDEX, categoryName)
    ? CATEGORY_PALETTE_INDEX[categoryName]
    : undefined;
  return typeof mapped === 'number'
    ? mapped
    : hashToIndex(categoryName, THEME.light.palette.length);
}

export function categoryColor(categoryName: string, theme: ThemeName): string {
  const palette = THEME[theme].palette;
  return palette[categoryColorIndex(categoryName) % palette.length];
}
