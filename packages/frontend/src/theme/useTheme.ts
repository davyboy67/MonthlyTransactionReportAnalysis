import { useSyncExternalStore } from 'react';
import type { ThemeName } from '@transaction-report/shared';
import { getResolvedTheme, subscribe } from './themeStore';
import { CHART_THEME, type ChartTheme } from './chartTheme';

export function useResolvedTheme(): ThemeName {
  return useSyncExternalStore(subscribe, getResolvedTheme, () => 'light' as ThemeName);
}

export function useChartTheme(): ChartTheme {
  return CHART_THEME[useResolvedTheme()];
}
