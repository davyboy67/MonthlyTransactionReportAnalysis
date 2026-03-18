import type { IMonthlySummary } from "../../types";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

type Props = {
  summary: IMonthlySummary;
};

export function MonthlyOverview({ summary }: Props) {
  const data = [
    { name: "Income", value: summary.totalIncome },
    { name: "Expenses", value: summary.totalExpenses },
    { name: "Savings", value: summary.totalSavings },
  ];

  const colours = ["#10b981", "#ef4444", "#3b82f6"];

  return (
    <section>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="80%"
            label={({ value }) => `${Number(value).toFixed(2)}`}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colours[index % colours.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number | undefined) =>
              value !== undefined ? `R ${value.toFixed(2)}` : ""
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </section>
  );
}
