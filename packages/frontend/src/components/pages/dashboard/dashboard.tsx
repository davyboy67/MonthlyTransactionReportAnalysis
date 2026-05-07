import { useEffect, useState } from "react";
import { apiClient } from "@transaction-report/shared";
import type { IReportAnalysis } from "@transaction-report/shared";
import type { ICategorySummary, IMonthlySummary } from "../../../types";
import { CategorySummary } from "../../organisms/categorySummary";
import { MonthlyOverview } from "../../organisms/monthlyOverview";
import { TopCategories } from "../../organisms/topCategories/TopCategories";
import { FileUpload } from "../../molecules/fileUpload/fileUpload";
import { MetricCards } from "../../molecules/metricComponents/MetricCards";
import { Tabs } from "../../atoms/tabs/Tabs";
import { BudgetTab } from "../../organisms/budgetTab/BudgetTab";
import { TrendAnalysisTab } from "../../organisms/trendAnalysisTab/TrendAnalysisTab";
import { getTopCategories } from "../../../utils/transactionAnalysis";
import "./dashboard.css";

type ActiveTab = "overview" | "budgets" | "trends";

const DASHBOARD_TABS: Array<{ id: ActiveTab; label: string }> = [
  { id: "overview", label: "Report Overview" },
  { id: "budgets", label: "Budgets" },
  { id: "trends", label: "Trend Analysis" },
];

function formatMonthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

export function Dashboard() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [reportAnalysis, setReportAnalysis] = useState<IReportAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .getReportForMonth(selectedMonth, selectedYear)
      .then((response) => {
        if (!cancelled) setReportAnalysis(response.ReportAnalysis);
      })
      .catch(() => {
        if (!cancelled) {
          setReportAnalysis(null);
          setError(null); // no report for month is not an error
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, selectedYear]);

  const navigateMonth = (delta: number): void => {
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const isOnCurrentMonth =
    selectedMonth === currentMonth && selectedYear === currentYear;

  const handleFileUploaded = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.processStatementFile(file);

      if (!response?.ReportAnalysis) {
        throw new Error("Failed to process file");
      }

      // Navigate to the month the uploaded statement belongs to
      const reportDate = new Date(response.ReportAnalysis.Date);
      const uploadedMonth = reportDate.getUTCMonth() + 1;
      const uploadedYear = reportDate.getUTCFullYear();
      setSelectedMonth(uploadedMonth);
      setSelectedYear(uploadedYear);
      setReportAnalysis(response.ReportAnalysis);
    } catch (err) {
      console.error("Error processing file:", err);
      setError("Failed to process the uploaded file");
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => {
    const showUpload = !reportAnalysis || isOnCurrentMonth;

    if (loading) {
      return <div className="dashboard-state">Loading...</div>;
    }

    if (error) {
      return (
        <div className="dashboard-state dashboard-state--error">
          Error: {error}
        </div>
      );
    }

    if (!reportAnalysis) {
      return (
        <>
          <div className="dashboard__month-nav">
            <button
              className="dashboard__nav-btn"
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
            >
              ←
            </button>
            <span className="dashboard__month-label">
              {formatMonthLabel(selectedMonth, selectedYear)}
            </span>
            <button
              className="dashboard__nav-btn"
              onClick={() => navigateMonth(1)}
              disabled={isOnCurrentMonth}
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <div className="dashboard__upload">
            <p className="dashboard__upload-title">
              {isOnCurrentMonth
                ? "Upload your bank statement to get started"
                : `No report for ${formatMonthLabel(selectedMonth, selectedYear)}`}
            </p>
            <FileUpload
              onFileUploaded={handleFileUploaded}
              acceptedFileTypes=".csv"
            />
          </div>
        </>
      );
    }

    const monthlySummary: IMonthlySummary = {
      month: new Date(reportAnalysis.Date).toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
      totalIncome: reportAnalysis.TotalIncome,
      totalExpenses: reportAnalysis.TotalExpenses,
      totalSavings: reportAnalysis.TotalSavings,
    };

    const categorySummaries: ICategorySummary[] =
      reportAnalysis.CategorySummaries?.map((summary) => ({
        name: summary.CategoryName,
        transactionCount: summary.Transactions?.length || 0,
        budget: 0,
        expenditure: summary.TotalAmount,
      })) || [];

    const topCategories = getTopCategories(
      reportAnalysis.CategorySummaries ?? [],
    );

    return (
      <>
        <div className="dashboard__month-nav">
          <button
            className="dashboard__nav-btn"
            onClick={() => navigateMonth(-1)}
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="dashboard__month-label">
            {formatMonthLabel(selectedMonth, selectedYear)}
          </span>
          <button
            className="dashboard__nav-btn"
            onClick={() => navigateMonth(1)}
            disabled={isOnCurrentMonth}
            aria-label="Next month"
          >
            →
          </button>
        </div>

        {showUpload && (
          <div className="dashboard__upload">
            <p className="dashboard__upload-title">Upload a new bank statement</p>
            <FileUpload
              onFileUploaded={handleFileUploaded}
              acceptedFileTypes=".csv"
            />
          </div>
        )}

        <MetricCards
          totalIncome={reportAnalysis.TotalIncome}
          totalExpenses={reportAnalysis.TotalExpenses}
          totalSavings={reportAnalysis.TotalSavings}
        />

        <div className="dashboard__charts">
          <div className="chart-card">
            <h2 className="chart-card__title">
              {monthlySummary.month} Overview
            </h2>
            <p className="chart-card__desc">
              Income vs expenses vs savings breakdown
            </p>
            <div className="chart-card__body">
              <div style={{ flex: 1 }}>
                <MonthlyOverview summary={monthlySummary} />
              </div>
              <div className="chart-card__insights">
                <div className="chart-insight">
                  <span
                    className="chart-insight__dot"
                    style={{ background: "#10b981" }}
                  />
                  <span className="chart-insight__label">Income</span>
                  <span className="chart-insight__value">
                    R {reportAnalysis.TotalIncome.toFixed(2)}
                  </span>
                </div>
                <div className="chart-insight">
                  <span
                    className="chart-insight__dot"
                    style={{ background: "#ef4444" }}
                  />
                  <span className="chart-insight__label">Expenses</span>
                  <span className="chart-insight__value">
                    R {reportAnalysis.TotalExpenses.toFixed(2)}
                  </span>
                </div>
                <div className="chart-insight">
                  <span
                    className="chart-insight__dot"
                    style={{ background: "#3b82f6" }}
                  />
                  <span className="chart-insight__label">Savings</span>
                  <span className="chart-insight__value">
                    R {reportAnalysis.TotalSavings.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h2 className="chart-card__title">Category Breakdown</h2>
            <p className="chart-card__desc">Spending by category this month</p>
            <CategorySummary summaries={categorySummaries} />
          </div>
        </div>

        <TopCategories categories={topCategories} />
      </>
    );
  };

  const renderBudgetsTab = () => (
    <BudgetTab reportAnalysis={reportAnalysis ?? undefined} />
  );

  const renderTrendsTab = () => <TrendAnalysisTab />;

  return (
    <main className="dashboard">
      <Tabs
        tabs={DASHBOARD_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "overview" ? renderOverviewTab() : null}
      {activeTab === "budgets" ? renderBudgetsTab() : null}
      {activeTab === "trends" ? renderTrendsTab() : null}
    </main>
  );
}
