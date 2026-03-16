import React from "react";
import "./MetricCards.css";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  accentColor: string;
  bgColor: string;
}

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
      {subtitle && (
        <span className="metric-card__subtitle">{subtitle}</span>
      )}
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
  const netPosition = totalIncome + totalSavings - totalExpenses;
  const savingsPercent =
    totalIncome > 0
      ? Math.round((totalSavings / totalIncome) * 100)
      : 0;
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
        accentColor="#10b981"
        bgColor="#f0fdf4"
      />
      <MetricCard
        label="Total Expenses"
        value={fmt(totalExpenses)}
        accentColor="#ef4444"
        bgColor="#fef2f2"
      />
      <MetricCard
        label="Actual Savings"
        value={fmt(totalSavings)}
        subtitle={`${savingsPercent}% of income saved`}
        accentColor="#3b82f6"
        bgColor="#eff6ff"
      />
      <MetricCard
        label="Net Position"
        value={fmt(Math.abs(netPosition))}
        subtitle={`${netPositive ? "+" : "-"}${netPercent}% of income`}
        accentColor={netPositive ? "#10b981" : "#ef4444"}
        bgColor={netPositive ? "#f0fdf4" : "#fef2f2"}
      />
    </div>
  );
}
