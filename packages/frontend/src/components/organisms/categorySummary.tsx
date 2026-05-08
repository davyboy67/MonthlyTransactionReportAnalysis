import type { ICategorySummary } from "../../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  CHART_GRID,
  CHART_AXIS,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_CURSOR_FILL,
  SERIES_COLORS,
} from "../../theme/theme";

interface CategorySummaryProps {
  summaries: ICategorySummary[];
}

const fmt = (n: number) =>
  `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function CategorySummary({ summaries }: CategorySummaryProps) {
  const data = summaries
    .filter(s => s.expenditure > 0)
    .sort((a, b) => b.expenditure - a.expenditure);

  const rowHeight = 36;
  const chartHeight = Math.max(data.length * rowHeight + 24, 280);

  return (
    <div style={{ height: 380, overflowY: "auto", paddingRight: 4 }}>
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
              tick={{ fontSize: 12, fill: CHART_AXIS }}
              tickLine={false}
              axisLine={{ stroke: CHART_GRID }}
              interval={0}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              cursor={{ fill: CHART_CURSOR_FILL }}
              formatter={(value: number | undefined) =>
                value !== undefined ? [fmt(value), "Spent"] : ["", ""]
              }
            />
            <Bar
              dataKey="expenditure"
              fill={SERIES_COLORS.savings}
              radius={[0, 6, 6, 0]}
              maxBarSize={20}
            >
              <LabelList
                dataKey="expenditure"
                position="right"
                fill={CHART_AXIS}
                fontSize={11}
                formatter={(v: unknown) => (typeof v === "number" ? fmt(v) : "")}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
