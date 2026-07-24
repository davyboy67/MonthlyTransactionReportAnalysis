import { formatMonthLabel } from '@transaction-report/shared';

interface MonthNavProps {
  month: number;
  year: number;
  onNavigate: (delta: number) => void;
  disableNext?: boolean;
}

export function MonthNav({ month, year, onNavigate, disableNext }: MonthNavProps) {
  return (
    <div className="tab-month-nav">
      <button className="tab-nav-btn" onClick={() => onNavigate(-1)} aria-label="Previous month">
        ←
      </button>
      <span className="tab-month-label">{formatMonthLabel(month, year)}</span>
      <button
        className="tab-nav-btn"
        onClick={() => onNavigate(1)}
        disabled={disableNext}
        aria-label="Next month"
      >
        →
      </button>
    </div>
  );
}
