import { useCallback, useMemo, useState } from 'react';

export interface MonthSelection {
  month: number; // 1-12
  year: number;
  navigate: (delta: number) => void;
  setMonthYear: (month: number, year: number) => void;
  isCurrentMonth: boolean;
  isPastMonth: boolean;
}

export function useMonthSelection(): MonthSelection {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [{ month, year }, setState] = useState({ month: currentMonth, year: currentYear });

  const navigate = useCallback((delta: number) => {
    setState(({ month, year }) => {
      let m = month + delta;
      let y = year;
      if (m > 12) {
        m = 1;
        y++;
      }
      if (m < 1) {
        m = 12;
        y--;
      }
      return { month: m, year: y };
    });
  }, []);

  const setMonthYear = useCallback((month: number, year: number) => {
    setState({ month, year });
  }, []);

  const isCurrentMonth = month === currentMonth && year === currentYear;
  const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);

  return useMemo(
    () => ({ month, year, navigate, setMonthYear, isCurrentMonth, isPastMonth }),
    [month, year, navigate, setMonthYear, isCurrentMonth, isPastMonth]
  );
}
