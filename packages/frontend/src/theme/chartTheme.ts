import { THEME, type ThemeName } from '@transaction-report/shared';

// Frozen at module scope: recharts compares props like `contentStyle` by
// identity, so building these inline in render would trigger chart work on
// every unrelated parent re-render.
export interface ChartTheme {
  palette: readonly string[];
  grid: string;
  axis: string;
  series: { income: string; expenses: string; savings: string };
  tooltipStyle: Record<string, string | number>;
  tooltipLabelStyle: Record<string, string>;
  cursorFill: string;
  cursorLine: string;
  axisTick: { fontSize: number; fill: string; fontFamily: string };
  legendStyle: { fontSize: number; color: string };
}

function build(theme: ThemeName): ChartTheme {
  const c = THEME[theme];
  return Object.freeze({
    palette: c.palette,
    grid: c.chartGrid,
    axis: c.chartAxis,
    series: { income: c.income, expenses: c.expenses, savings: c.savings },
    tooltipStyle: Object.freeze({
      backgroundColor: c.chartTooltipBg,
      border: `1px solid ${c.chartTooltipBorder}`,
      borderRadius: 10,
      color: c.textPrimary,
      fontSize: 13,
    }),
    tooltipLabelStyle: Object.freeze({ color: c.textSecondary }),
    cursorFill: c.chartCursorFill,
    cursorLine: c.chartCursorLine,
    axisTick: Object.freeze({
      fontSize: 11,
      fill: c.chartAxis,
      fontFamily: "'Geist Mono Variable', ui-monospace, monospace",
    }),
    legendStyle: Object.freeze({ fontSize: 11, color: c.chartAxis }),
  }) as ChartTheme;
}

export const CHART_THEME: Readonly<Record<ThemeName, ChartTheme>> = {
  light: build('light'),
  dark: build('dark'),
};
