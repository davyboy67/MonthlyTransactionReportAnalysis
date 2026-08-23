import { readFileSync } from 'fs';
import { join } from 'path';
import { THEME, type ThemeColors } from '../packages/shared/src/design/tokens';

/**
 * The design system has two physical sources: `tokens.css` for the cascade and
 * `tokens.ts` for the things that cannot read CSS variables (recharts props,
 * pdfkit, the email HTML string). Neither can be generated from the other
 * without a codegen step that would have to run before Vite, which is a worse
 * failure mode than a test.
 *
 * This guard makes drift a red build rather than a colour that is subtly wrong
 * in the PDF but right on screen.
 */

const cssPath = join(__dirname, '..', 'packages', 'frontend', 'src', 'styles', 'tokens.css');
const css = readFileSync(cssPath, 'utf8');

/** Everything between `:root {` / `:root[data-theme='dark'] {` and its closing brace. */
function block(selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`tokens.css has no ${selector} block`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  return css.slice(open, close);
}

function readVar(scope: string, name: string): string | undefined {
  const match = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(scope);
  return match?.[1].trim().toLowerCase();
}

const lightBlock = block(':root {');
const darkBlock = block(":root[data-theme='dark']");

/** Maps a ThemeColors key to its CSS custom property name. */
const VAR_NAMES: Partial<Record<keyof ThemeColors, string>> = {
  surfacePage: '--surface-page',
  surfaceSunken: '--surface-sunken',
  surfaceCard: '--surface-card',
  surfaceRaised: '--surface-raised',
  surfaceHover: '--surface-hover',
  surfaceActive: '--surface-active',
  borderHairline: '--border-hairline',
  borderStrong: '--border-strong',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textTertiary: '--text-tertiary',
  accent: '--accent',
  accentHover: '--accent-hover',
  textOnAccent: '--text-on-accent',
  focusRing: '--focus-ring',
  income: '--data-income',
  expenses: '--data-expenses',
  savings: '--data-savings',
  warning: '--data-warning',
  incomeSoft: '--data-income-soft',
  expensesSoft: '--data-expenses-soft',
  savingsSoft: '--data-savings-soft',
  warningSoft: '--data-warning-soft',
  chartGrid: '--chart-grid',
  chartAxis: '--chart-axis',
  chartTooltipBg: '--chart-tooltip-bg',
  chartTooltipBorder: '--chart-tooltip-border',
  chartCursorFill: '--chart-cursor-fill',
  chartCursorLine: '--chart-cursor-line',
};

describe.each([
  ['light', lightBlock, THEME.light],
  ['dark', darkBlock, THEME.dark],
] as const)('%s theme parity', (themeName, scope, colors) => {
  const entries = Object.entries(VAR_NAMES) as [keyof ThemeColors, string][];

  it.each(entries)('%s matches %s in tokens.css', (key, varName) => {
    const cssValue = readVar(scope, varName);
    expect(cssValue).toBeDefined();
    // rgba() spacing differs between the two files; compare without whitespace.
    const normalise = (v: string) => v.replace(/\s+/g, '');
    expect(normalise(cssValue!)).toBe(normalise((colors[key] as string).toLowerCase()));
  });

  it('has a palette of the expected length', () => {
    expect(colors.palette).toHaveLength(8);
    expect(new Set(colors.palette).size).toBe(8);
  });

  it(`declares every ${themeName} palette entry as a valid hex`, () => {
    colors.palette.forEach(hex => expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });
});

describe('token hygiene', () => {
  it('defines the dark theme as an override of the light default', () => {
    // Light must be on bare :root so a viewer with no stored preference and no
    // JS still gets a complete palette.
    expect(css.indexOf(':root {')).toBeLessThan(css.indexOf(":root[data-theme='dark']"));
  });

  it('carries no glassmorphism or gradient declarations', () => {
    expect(css).not.toMatch(/backdrop-filter/);
    expect(css).not.toMatch(/linear-gradient|radial-gradient/);
  });
});
