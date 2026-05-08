import type { IMonthlySummary } from "../../types";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  SERIES_COLORS,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  COLORS,
} from "../../theme/theme";
import "./monthlyOverview.css";

type Props = {
  summary: IMonthlySummary;
};

const fmt = (n: number) =>
  `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function MonthlyOverview({ summary }: Props) {
  const data = [
    { name: "Income", value: summary.totalIncome },
    { name: "Expenses", value: summary.totalExpenses },
    { name: "Savings", value: summary.totalSavings },
  ];

  const colours = [SERIES_COLORS.income, SERIES_COLORS.expenses, SERIES_COLORS.savings];
  const net = summary.totalIncome - summary.totalExpenses - summary.totalSavings;
  const netPositive = net >= 0;

  return (
    <section style={{ position: "relative", width: "100%" }}>
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
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colours[index % colours.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            itemStyle={{ color: COLORS.textPrimary }}
            formatter={(value: number | undefined) =>
              value !== undefined ? fmt(value) : ""
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="monthly-overview__centre">
        <span className="monthly-overview__centre-label">Net</span>
        <span
          className="monthly-overview__centre-value"
          style={{ color: netPositive ? SERIES_COLORS.income : SERIES_COLORS.expenses }}
        >
          {netPositive ? "+" : "−"} {fmt(Math.abs(net))}
        </span>
      </div>
    </section>
  );
}
