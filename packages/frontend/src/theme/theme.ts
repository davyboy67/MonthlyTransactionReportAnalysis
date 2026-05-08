/**
 * Single source of truth for all theme colours.
 *
 * CSS files reference these via `var(--color-foo)` etc. The variables are
 * injected at app boot by `applyThemeVars()` (called from main.tsx), so this
 * TS module is the only place a colour value should ever be hard-coded.
 *
 * If you change a hex value here, the CSS picks it up automatically — there
 * are no parallel definitions in index.css to keep in sync.
 */

export const COLORS = {
  // Surface
  bg: '#0b1220',
  bgElevated: '#111a2e',

  // Text
  textPrimary: '#e5e7eb',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',

  // Brand accents — Tailwind 700 range, muted enough to feel professional on
  // a dark surface without losing hue recognition.
  income: '#15803d',
  expenses: '#b91c1c',
  savings: '#1d4ed8',

  // Categorical chart palette (8 hues, all in the 700 range so they sit
  // together at the same visual weight as the brand accents).
  palette: [
    '#15803d', // green
    '#1d4ed8', // blue
    '#b45309', // amber
    '#b91c1c', // red
    '#6d28d9', // violet
    '#0e7490', // cyan
    '#c2410c', // orange
    '#9d174d', // pink
  ] as const,

  // Glass surface
  glassBg: 'rgba(255, 255, 255, 0.05)',
  glassBgStrong: 'rgba(255, 255, 255, 0.09)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
  glassBlur: '18px',
  glassRadius: '16px',

  // Chart-specific
  chartGrid: 'rgba(255, 255, 255, 0.06)',
  chartTooltipBg: 'rgba(17, 26, 46, 0.95)',
  chartTooltipBorder: 'rgba(255, 255, 255, 0.12)',
  // Hover cursor — slightly lighter than the surface so it reads as "lit up"
  // rather than the default ugly grey block.
  chartCursorFill: 'rgba(255, 255, 255, 0.05)',
  chartCursorLine: 'rgba(255, 255, 255, 0.18)',
} as const;

// ───────────────────────────────────────────────────────────
// Recharts-friendly re-exports
// ───────────────────────────────────────────────────────────

export const CHART_PALETTE = COLORS.palette;
export const CHART_GRID = COLORS.chartGrid;
export const CHART_AXIS = COLORS.textSecondary;

export const SERIES_COLORS = {
  income: COLORS.income,
  expenses: COLORS.expenses,
  savings: COLORS.savings,
};

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: COLORS.chartTooltipBg,
  border: `1px solid ${COLORS.chartTooltipBorder}`,
  borderRadius: 10,
  color: COLORS.textPrimary,
  boxShadow: COLORS.glassShadow,
};

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: COLORS.textSecondary,
};

export const CHART_CURSOR_FILL = COLORS.chartCursorFill;
export const CHART_CURSOR_LINE = COLORS.chartCursorLine;

// ───────────────────────────────────────────────────────────
// CSS variable injection
// ───────────────────────────────────────────────────────────

/**
 * Set CSS custom properties on :root from the COLORS object above.
 * Called once from main.tsx before React mounts, so the variables are
 * available before the first paint.
 */
export function applyThemeVars(): void {
  const root = document.documentElement;
  const set = (name: string, value: string) => root.style.setProperty(name, value);

  set('--color-bg', COLORS.bg);
  set('--color-bg-elevated', COLORS.bgElevated);

  set('--color-text-primary', COLORS.textPrimary);
  set('--color-text-secondary', COLORS.textSecondary);
  set('--color-text-muted', COLORS.textMuted);

  set('--color-border', COLORS.border);
  set('--color-border-strong', COLORS.borderStrong);

  set('--color-income', COLORS.income);
  set('--color-expenses', COLORS.expenses);
  set('--color-savings', COLORS.savings);

  set('--glass-bg', COLORS.glassBg);
  set('--glass-bg-strong', COLORS.glassBgStrong);
  set('--glass-border', COLORS.glassBorder);
  set('--glass-shadow', COLORS.glassShadow);
  set('--glass-blur', COLORS.glassBlur);
  set('--glass-radius', COLORS.glassRadius);
}
