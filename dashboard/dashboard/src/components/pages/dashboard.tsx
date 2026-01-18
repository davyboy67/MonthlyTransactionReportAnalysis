import { useEffect, useState } from "react";
import { apiClient } from "../../../../../services/apiClient";
import type { ICategorySummary, IMonthlySummary } from "../../types";
import { CategorySummary } from "../organisms/categorySummary";
import { MonthlyOverview } from "../organisms/monthlyOverview";
import type { IReportAnalysis } from "../../../../../models/IReportAnalysis";

export function Dashboard() {
  const [reportAnalysis, setReportAnalysis] = useState<IReportAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient.RetrieveReportAnalysis(new Date());
        setReportAnalysis(data);
      } catch (err) {
        setError("Failed to fetch report analysis");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!reportAnalysis) {
    return <div>No data available</div>;
  }

  const monthlySummary: IMonthlySummary = {
    month: new Date(reportAnalysis.date).toLocaleString('default', { month: 'long', year: 'numeric' }),
    totalIncome: reportAnalysis.totalIncome,
    totalExpenses: reportAnalysis.totalExpenses,
  };

  const categorySummaries: ICategorySummary[] = reportAnalysis.categorySummaries.map(summary => ({
    name: summary.categoryName,
    transactionCount: summary.transactions.length,
    budget: 0, // No budget data from API
    expenditure: summary.totalAmount,
  }));

  return (
    <main className="w-100">
      <h1>Dashboard</h1>
      <div className="dashboard-layout w-100" >
        <div className="dashboard-section">
          <MonthlyOverview summary={monthlySummary} />
        </div>
        <div className="dashboard-section">
          <CategorySummary summaries={categorySummaries} />
        </div>
      </div>
    </main>
  );
}