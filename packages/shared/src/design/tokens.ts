/**
 * Cross-package colour tokens.
 *
 * Must stay plain data with no DOM dependency: Lambda (pdfkit, ChartBuilder)
 * and the email HTML both import it, and email clients cannot read CSS
 * variables at all.
 *
 * Mirrored in packages/frontend/src/styles/tokens.css. Change a value in one
 * and __tests__/design-tokens.test.ts fails until you change the other.
 *
 * Theme-keyed rather than flat so the PDF can pin THEME.light: paper is white
 * whatever the user has selected in the app.
 */

export type ThemeName = 'light' | 'dark';

export interface ThemeColors {
  surfacePage: string;
  surfaceSunken: string;
  surfaceCard: string;
  /** Must sit above surfaceCard: menus, popovers, tooltips. */
  surfaceRaised: string;
  surfaceHover: string;
  surfaceActive: string;

  borderHairline: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  /** Exactly one accent exists; every CTA uses it. */
  accent: string;
  accentHover: string;
  textOnAccent: string;
  focusRing: string;

  /** Semantic data colours. Each clears 4.5:1 on `surfaceCard`. */
  income: string;
  expenses: string;
  savings: string;
  warning: string;

  incomeSoft: string;
  expensesSoft: string;
  savingsSoft: string;
  warningSoft: string;

  /** Categorical series colours. Index order is stable; see categoryColors.ts. */
  palette: readonly string[];

  chartGrid: string;
  chartAxis: string;
  chartTooltipBg: string;
  chartTooltipBorder: string;
  chartCursorFill: string;
  chartCursorLine: string;
}

const light: ThemeColors = {
  surfacePage: '#FFFFFF',
  surfaceSunken: '#F7F6F3',
  surfaceCard: '#FFFFFF',
  surfaceRaised: '#FCFCFB',
  surfaceHover: '#F2F1ED',
  surfaceActive: '#EBEAE5',

  borderHairline: '#EAEAEA',
  borderStrong: '#D8D6D0',

  textPrimary: '#111111',
  textSecondary: '#5B5F66',
  textTertiary: '#6C7079',

  accent: '#111111',
  accentHover: '#2F3437',
  textOnAccent: '#FFFFFF',
  focusRing: '#2B4FA8',

  income: '#1F6F43',
  expenses: '#A32B2B',
  savings: '#2B4FA8',
  warning: '#8A5A00',

  incomeSoft: '#EDF5F0',
  expensesSoft: '#FBEFEF',
  savingsSoft: '#EDF1FA',
  warningSoft: '#FAF3E6',

  palette: [
    '#2F6E4F', // 0 green
    '#2B4FA8', // 1 blue
    '#8A5A00', // 2 amber
    '#A32B2B', // 3 red
    '#5B3E9E', // 4 violet
    '#1F6F7A', // 5 teal
    '#A34F1E', // 6 orange
    '#8E2E5C', // 7 pink
  ],

  chartGrid: '#EFEEEA',
  chartAxis: '#6C7079',
  chartTooltipBg: '#FFFFFF',
  chartTooltipBorder: '#EAEAEA',
  chartCursorFill: 'rgba(17, 17, 17, 0.04)',
  chartCursorLine: 'rgba(17, 17, 17, 0.18)',
};

const dark: ThemeColors = {
  // Warm neutral rather than the previous navy, so the dark theme reads as the
  // same product as the warm-monochrome light theme rather than a second brand.
  surfacePage: '#121211',
  surfaceSunken: '#0D0D0C',
  surfaceCard: '#191918',
  surfaceRaised: '#201F1E',
  surfaceHover: '#232322',
  surfaceActive: '#2B2A29',

  borderHairline: '#2A2A28',
  borderStrong: '#3A3A37',

  textPrimary: '#EDEDEC',
  textSecondary: '#A6A6A1',
  textTertiary: '#8A8A85',

  accent: '#EDEDEC',
  accentHover: '#FFFFFF',
  textOnAccent: '#121211',
  focusRing: '#7AA2F7',

  income: '#4FBF80',
  expenses: '#E0736B',
  savings: '#7AA2F7',
  warning: '#E2B44F',

  incomeSoft: '#16261E',
  expensesSoft: '#2A1918',
  savingsSoft: '#171D2B',
  warningSoft: '#2A2314',

  palette: [
    '#5FB98A', // 0 green
    '#7AA2F7', // 1 blue
    '#D3A24A', // 2 amber
    '#E0736B', // 3 red
    '#A88AE0', // 4 violet
    '#5AAFBC', // 5 teal
    '#DA8A5F', // 6 orange
    '#CE7AA6', // 7 pink
  ],

  chartGrid: '#262625',
  chartAxis: '#8A8A85',
  chartTooltipBg: '#201F1E',
  chartTooltipBorder: '#3A3A37',
  chartCursorFill: 'rgba(255, 255, 255, 0.06)',
  chartCursorLine: 'rgba(255, 255, 255, 0.24)',
};

export const THEME: Readonly<Record<ThemeName, ThemeColors>> = { light, dark };
