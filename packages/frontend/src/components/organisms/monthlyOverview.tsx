import type { IMonthlySummary } from "../../types";
import { formatZar } from "@transaction-report/shared";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { useChartTheme } from "../../theme/useTheme";
import "./monthlyOverview.css";

type Props = {
  summary: IMonthlySummary;
};

export function MonthlyOverview({ summary }: Props) {
  const chart = useChartTheme();

  const data = [
    { name: "Income", value: summary.totalIncome },
    { name: "Expenses", value: summary.totalExpenses },
    { name: "Savings", value: summary.totalSavings },
  ];

  const colours = [chart.series.income, chart.series.expenses, chart.series.savings];
  const net = summary.totalIncome - summary.totalExpenses - summary.totalSavings;
  const netPositive = net >= 0;

  const summaryText = `Donut chart. Income ${formatZar(summary.totalIncome)}, expenses ${formatZar(
    summary.totalExpenses,
  )}, savings ${formatZar(summary.totalSavings)}. Net position ${
    netPositive ? "positive" : "negative"
  } ${formatZar(Math.abs(net))}.`;

  return (
    <figure className="monthly-overview" role="img" aria-label={summaryText}>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={3}
            cornerRadius={6}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={colours[index % colours.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={chart.tooltipStyle}
            labelStyle={chart.tooltipLabelStyle}
            formatter={(value: number | undefined) =>
              value !== undefined ? formatZar(value) : ""
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="monthly-overview__centre">
        <span className="monthly-overview__centre-label">Net</span>
        <span
          className={`monthly-overview__centre-value monthly-overview__centre-value--${
            netPositive ? "positive" : "negative"
          }`}
        >
          {/* U+2212 minus sign, not a hyphen: aligns with the digit grid. */}
          {netPositive ? "+" : "−"} {formatZar(Math.abs(net))}
        </span>
      </div>
    </figure>
  );
}
