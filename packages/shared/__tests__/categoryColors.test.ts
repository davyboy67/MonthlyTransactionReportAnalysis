import { categoryColor, categoryColorIndex } from '../src/design/categoryColors';
import { THEME } from '../src/design/tokens';

describe('categoryColorIndex', () => {
  it('maps known categories to their assigned hue', () => {
    expect(categoryColorIndex('Groceries')).toBe(0);
    expect(categoryColorIndex('Transport')).toBe(1);
  });

  it('gives the eight likeliest top-five categories distinct hues', () => {
    const likely = [
      'Groceries', 'Transport', 'Utilities', 'Health',
      'Entertainment', 'Insurance', 'Dining Out', 'Shopping',
    ];
    expect(new Set(likely.map(categoryColorIndex)).size).toBe(likely.length);
  });

  it('is stable for unknown names rather than positional', () => {
    expect(categoryColorIndex('Crypto')).toBe(categoryColorIndex('Crypto'));
  });

  /**
   * Merchant names reach this function from user-supplied CSV, so a name that
   * collides with an Object.prototype key must not resolve to an inherited
   * Function and index the palette with NaN.
   */
  it.each(['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__'])(
    'returns a real palette colour for the prototype key %s',
    key => {
      const index = categoryColorIndex(key);
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(THEME.light.palette.length);
      expect(categoryColor(key, 'light')).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(categoryColor(key, 'dark')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  );
});
