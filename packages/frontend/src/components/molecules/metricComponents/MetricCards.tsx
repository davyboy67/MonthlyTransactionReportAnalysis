import { formatZar } from "@transaction-report/shared";
import { GlassPanel } from "../../atoms/glassPanel/GlassPanel";
import { SERIES_COLORS } from "../../../theme/theme";
import "./MetricCards.css";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  tint: string;
}

function MetricCard({ label, value, subtitle, tint }: MetricCardProps) {
  return (
    <GlassPanel className="metric-card" tint={tint}>
      <span className="metric-card__label">{label}</span>
      <span className="metric-card__value">{value}</span>
      {subtitle && <span className="metric-card__subtitle">{subtitle}</span>}
    </GlassPanel>
  );
}

interface MetricCardsProps {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
}

export function MetricCards({
  totalIncome,
  totalExpenses,
  totalSavings,
}: MetricCardsProps) {
  const netPosition = totalIncome - totalSavings - totalExpenses;
  const savingsPercent =
    totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;
  const netPercent =
    totalIncome > 0
      ? Math.round((Math.abs(netPosition) / totalIncome) * 100)
      : 0;

  const fmt = (n: number) => formatZar(n);

  const netPositive = netPosition >= 0;

  return (
    <div className="metric-cards">
      <MetricCard
        label="Total Income"
        value={fmt(totalIncome)}
        tint={SERIES_COLORS.income}
      />
      <MetricCard
        label="Total Expenses"
        value={fmt(totalExpenses)}
        tint={SERIES_COLORS.expenses}
      />
      <MetricCard
        label="Actual Savings"
        value={fmt(totalSavings)}
        subtitle={`${savingsPercent}% of income saved`}
        tint={SERIES_COLORS.savings}
      />
      <MetricCard
        label="Net Position"
        value={fmt(Math.abs(netPosition))}
        subtitle={`${netPositive ? "+" : "-"}${netPercent}% of income`}
        tint={netPositive ? SERIES_COLORS.income : SERIES_COLORS.expenses}
      />
    </div>
  );
}
