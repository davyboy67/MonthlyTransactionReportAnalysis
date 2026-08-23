import type { CategoryBreakdownItem } from "../../types";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { formatZar, categoryColor } from "@transaction-report/shared";
import { useChartTheme, useResolvedTheme } from "../../theme/useTheme";
import "./categorySummary.css";

interface CategorySummaryProps {
  summaries: CategoryBreakdownItem[];
}

const fmt = (n: number) => formatZar(n, 0);

export function CategorySummary({ summaries }: CategorySummaryProps) {
  const chart = useChartTheme();
  const theme = useResolvedTheme();

  const data = summaries
    .filter(s => s.expenditure > 0)
    .sort((a, b) => b.expenditure - a.expenditure);

  const rowHeight = 36;
  const chartHeight = Math.max(data.length * rowHeight + 24, 280);

  const summaryText = `Bar chart of spending by category. ${data
    .slice(0, 5)
    .map(d => `${d.name} ${fmt(d.expenditure)}`)
    .join(", ")}${data.length > 5 ? `, and ${data.length - 5} more` : ""}.`;

  return (
    <figure
      className="category-summary"
      role="img"
      aria-label={summaryText}
      tabIndex={0}
    >
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 8, right: 96, left: 8, bottom: 8 }}
            barCategoryGap={8}
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={chart.axisTick}
              tickLine={false}
              axisLine={{ stroke: chart.grid }}
              interval={0}
            />
            <Tooltip
              contentStyle={chart.tooltipStyle}
              labelStyle={chart.tooltipLabelStyle}
              cursor={{ fill: chart.cursorFill }}
              formatter={(value: number | undefined) =>
                value !== undefined ? [fmt(value), "Spent"] : ["", ""]
              }
            />
            <Bar
              dataKey="expenditure"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              isAnimationActive={false}
            >
              {data.map(entry => (
                <Cell key={entry.name} fill={categoryColor(entry.name, theme)} />
              ))}
              <LabelList
                dataKey="expenditure"
                position="right"
                fill={chart.axis}
                fontSize={11}
                fontFamily="var(--font-mono)"
                formatter={(v: unknown) => (typeof v === "number" ? fmt(v) : "")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
