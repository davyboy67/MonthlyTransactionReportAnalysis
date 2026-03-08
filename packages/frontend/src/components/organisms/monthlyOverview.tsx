import type { IMonthlySummary } from "../../types";
import { MetricTile } from "../molecules/metricTile";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type Props = {
    summary: IMonthlySummary;
}

export function MonthlyOverview({ summary }: Props) {
    const data = [
        { name: 'Income', value: summary.totalIncome, fill: '#1f57ff' },
        { name: 'Expenses', value: summary.totalExpenses, fill: '#0073ad' },
        { name: 'Savings', value: summary.totalSavings, fill: '#28a745' },
    ];

    return (
    <section>
      <h2>{summary.month} Overview</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
        <MetricTile label="Income" value={`R ${summary.totalIncome.toFixed(2)}`} />
        <MetricTile label="Expenses" value={`R ${summary.totalExpenses.toFixed(2)}`} />
        <MetricTile label="Savings" value={`R ${summary.totalSavings.toFixed(2)}`} />
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
      </div>
    </section>
  );
}