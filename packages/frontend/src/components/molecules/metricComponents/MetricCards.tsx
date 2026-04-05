import React from "react";
import "./MetricCards.css";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  accentColor: string;
  bgColor: string;
}
const MetricCardColor = {
  Green: "#10b981",
  Red: "#ef4444",
  Blue: "#3b82f6",
  Background_white: "#f0fdf4",
};

function MetricCard({
  label,
  value,
  subtitle,
  accentColor,
  bgColor,
}: MetricCardProps) {
  return (
    <div
      className="metric-card"
      style={
        {
          "--accent-color": accentColor,
          "--bg-color": bgColor,
        } as React.CSSProperties
      }
    >
      <span className="metric-card__label">{label}</span>
      <span className="metric-card__value">{value}</span>
      {subtitle && <span className="metric-card__subtitle">{subtitle}</span>}
    </div>
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
  // Net position = assets (income + savings) minus liabilities (expenses)
  const netPosition = totalIncome - totalSavings - totalExpenses;
  const savingsPercent =
    totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;
  const netPercent =
    totalIncome > 0
      ? Math.round((Math.abs(netPosition) / totalIncome) * 100)
      : 0;

  const fmt = (n: number) =>
    `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const netPositive = netPosition >= 0;

  return (
    <div className="metric-cards">
      <MetricCard
        label="Total Income"
        value={fmt(totalIncome)}
        accentColor={MetricCardColor.Green}
        bgColor={MetricCardColor.Background_white}
      />
      <MetricCard
        label="Total Expenses"
        value={fmt(totalExpenses)}
        accentColor={MetricCardColor.Red}
        bgColor={MetricCardColor.Background_white}
      />
      <MetricCard
        label="Actual Savings"
        value={fmt(totalSavings)}
        subtitle={`${savingsPercent}% of income saved`}
        accentColor={MetricCardColor.Blue}
        bgColor={MetricCardColor.Background_white}
      />
      <MetricCard
        label="Net Position"
        value={fmt(Math.abs(netPosition))}
        subtitle={`${netPositive ? "+" : "-"}${netPercent}% of income`}
        accentColor={netPositive ? MetricCardColor.Green : MetricCardColor.Red}
        bgColor={netPositive ? MetricCardColor.Background_white : "#fef2f2"}
      />
    </div>
  );
}
