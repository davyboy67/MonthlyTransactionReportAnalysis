import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { apiClient } from '@transaction-report/shared';
import type { IReportAnalysis } from '@transaction-report/shared';
import './TrendAnalysisTab.css';

const CHART_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
];

const fmtCurrency = (v: number | undefined) =>
  `R ${(v ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function TrendAnalysisTab() {
  const [reports, setReports] = useState<IReportAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .getTrendAnalysis(12)
      .then(res => setReports(res.reports))
      .catch(() => setError('Failed to load trend data'))
      .finally(() => setIsLoading(false));
  }, []);

  const monthLabels = useMemo(
    () =>
      reports.map(r =>
        new Date(r.Date).toLocaleString('default', { month: 'short', year: '2-digit' })
      ),
    [reports]
  );

  const savingsRateData = useMemo(
    () =>
      reports.map((r, i) => ({
        month: monthLabels[i],
        rate: r.TotalIncome > 0 ? Math.round((r.TotalSavings / r.TotalIncome) * 100) : 0,
      })),
    [reports, monthLabels]
  );

  // Chart 2 — Net position grouped bar
  const netPositionData = useMemo(
    () =>
      reports.map((r, i) => ({
        month: monthLabels[i],
        Income: r.TotalIncome,
        Expenses: r.TotalExpenses,
        Savings: r.TotalSavings,
      })),
    [reports, monthLabels]
  );

  // Chart 3 — Top 5 expense categories stacked bar
  const { top5Categories, categorySpendData } = useMemo(() => {
    const totals = new Map<string, number>();
    reports.forEach(r =>
      r.CategorySummaries.filter(
        cs => cs.CategoryName !== 'Income' && cs.CategoryName !== 'Savings'
      ).forEach(cs =>
        totals.set(cs.CategoryName, (totals.get(cs.CategoryName) ?? 0) + cs.TotalAmount)
      )
    );
    const top5 = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const data = reports.map((r, i) => {
      const row: Record<string, number | string> = { month: monthLabels[i] };
      top5.forEach(cat => {
        row[cat] = r.CategorySummaries.find(cs => cs.CategoryName === cat)?.TotalAmount ?? 0;
      });
      return row;
    });

    return { top5Categories: top5, categorySpendData: data };
  }, [reports, monthLabels]);

  // Chart 4 — Recurring transactions (merchant appears in 2+ months)
  const { recurringMerchants, recurringData } = useMemo(() => {
    const merchantMap = new Map<string, { month: string; amount: number }[]>();
    reports.forEach((r, i) =>
      r.CategorySummaries.filter(cs => cs.CategoryName !== 'Income').forEach(cs =>
        cs.Transactions.forEach(t => {
          const key = t.Merchant || t.Description;
          if (!merchantMap.has(key)) merchantMap.set(key, []);
          merchantMap.get(key)!.push({ month: monthLabels[i], amount: t.Amount });
        })
      )
    );

    const recurring = [...merchantMap.entries()]
      .filter(([, entries]) => new Set(entries.map(e => e.month)).size >= 2)
      .sort(
        (a, b) => b[1].reduce((s, e) => s + e.amount, 0) - a[1].reduce((s, e) => s + e.amount, 0)
      )
      .slice(0, 5);

    const data = monthLabels.map(month => {
      const row: Record<string, number | string> = { month };
      recurring.forEach(([merchant, entries]) => {
        row[merchant] = entries.filter(e => e.month === month).reduce((s, e) => s + e.amount, 0);
      });
      return row;
    });

    return { recurringMerchants: recurring, recurringData: data };
  }, [reports, monthLabels]);

  if (isLoading) {
    return <div className="trend-tab__loading">Loading trend data…</div>;
  }

  if (error) {
    return <div className="trend-tab__error">{error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="trend-tab__empty">
        <p>No reports yet — upload a bank statement to get started.</p>
      </div>
    );
  }

  return (
    <div className="trend-tab">
      <div className="trend-tab__grid">
        {/* Chart 1 — Savings Rate */}
        <div className="trend-card">
          <h2 className="trend-card__title">Savings Rate</h2>
          <p className="trend-card__desc">Percentage of income saved each month</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={savingsRateData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
              <Tooltip formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Savings Rate']} />
              <ReferenceLine
                y={20}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: '20% target', fontSize: 10, fill: '#10b981' }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2 — Net Position */}
        <div className="trend-card">
          <h2 className="trend-card__title">Net Position</h2>
          <p className="trend-card__desc">Income, expenses and savings per month</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={netPositionData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `R${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={fmtCurrency} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Savings" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="trend-card trend-card--full">
          <h2 className="trend-card__title">Top 5 Spending Categories</h2>
          <p className="trend-card__desc">Monthly breakdown of your biggest expense areas</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categorySpendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `R${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={fmtCurrency} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {top5Categories.map((cat, i) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId="a"
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={i === top5Categories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {recurringMerchants.length > 0 && (
          <div className="trend-card trend-card--full">
            <h2 className="trend-card__title">Recurring Transactions</h2>
            <p className="trend-card__desc">
              Merchants appearing in 2 or more months — track how costs change over time
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={recurringData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `R${(v / 1000).toFixed(1)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={fmtCurrency} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {recurringMerchants.map(([merchant], i) => (
                  <Line
                    key={merchant}
                    type="monotone"
                    dataKey={merchant}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
