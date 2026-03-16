import type { IMonthlySummary } from "../../types";
import { MetricTile } from "../molecules/metricTile";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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

  const colours = ["#035700", "#680202", "#0003a0"];

  return (
    <section>
      {/* <h2>{summary.month} Overview</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
        }}
      >
        <MetricTile
          label="Income"
          value={`R ${summary.totalIncome.toFixed(2)}`}
        />
        <MetricTile
          label="Expenses"
          value={`R ${summary.totalExpenses.toFixed(2)}`}
        />
        <MetricTile
          label="Savings"
          value={`R ${summary.totalSavings.toFixed(2)}`}
        />
      </div>

      <div style={{ marginTop: "2rem", height: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div> */}

      <ResponsiveContainer width="100%" height={600}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={"80%"}
            fill="#8884d8"
            label={({ name, value }) => `${name}: ${value}`}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colours[index % colours.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </section>
  );
}
