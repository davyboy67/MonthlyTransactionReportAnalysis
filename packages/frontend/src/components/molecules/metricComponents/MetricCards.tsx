import { formatZar } from '@transaction-report/shared';
import { Surface, type SurfaceTone } from '../../atoms/surface/Surface';
import './MetricCards.css';

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  tone: SurfaceTone;
}

function MetricCard({ label, value, subtitle, tone }: MetricCardProps) {
  return (
    <Surface className="metric-card" tone={tone}>
      <dt className="metric-card__label">{label}</dt>
      <dd className="metric-card__body">
        <span className="metric-card__value">{value}</span>
        {subtitle && <span className="metric-card__subtitle">{subtitle}</span>}
      </dd>
    </Surface>
  );
}

interface MetricCardsProps {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
}

export function MetricCards({ totalIncome, totalExpenses, totalSavings }: MetricCardsProps) {
  const netPosition = totalIncome - totalSavings - totalExpenses;
  const savingsPercent = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;
  const netPercent = totalIncome > 0 ? Math.round((Math.abs(netPosition) / totalIncome) * 100) : 0;

  const fmt = (n: number) => formatZar(n);

  const netPositive = netPosition >= 0;

  return (
    <dl className="metric-cards">
      <MetricCard label="Total Income" value={fmt(totalIncome)} tone="income" />
      <MetricCard label="Total Expenses" value={fmt(totalExpenses)} tone="expenses" />
      <MetricCard
        label="Actual Savings"
        value={fmt(totalSavings)}
        subtitle={`${savingsPercent}% of income saved`}
        tone="savings"
      />
      <MetricCard
        label="Net Position"
        value={fmt(Math.abs(netPosition))}
        subtitle={`${netPositive ? '+' : '-'}${netPercent}% of income`}
        tone={netPositive ? 'income' : 'expenses'}
      />
    </dl>
  );
}
