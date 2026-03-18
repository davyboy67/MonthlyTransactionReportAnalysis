import { useEffect, useState } from "react";
import { apiClient } from "@transaction-report/shared";
import type { IReportAnalysis } from "@transaction-report/shared";
import type { ICategorySummary, IMonthlySummary } from "../../types";
import { CategorySummary } from "../organisms/categorySummary";
import { MonthlyOverview } from "../organisms/monthlyOverview";
import { TopCategories } from "../organisms/TopCategories";
import { FileUpload } from "../molecules/fileUpload";
import { MetricCards } from "../molecules/MetricCards";
import { getTopCategories } from "../../utils/transactionAnalysis";
import "./dashboard.css";

interface DashboardDetailsResponse {
  ReportAnalysis: IReportAnalysis;
}

export function Dashboard() {
  const [reportAnalysis, setReportAnalysis] = useState<IReportAnalysis | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response: DashboardDetailsResponse =
          await apiClient.RetrieveReportAnalysis();
        if (!response?.ReportAnalysis) {
          throw new Error("No report analysis data received");
        }
        setReportAnalysis(response.ReportAnalysis);
      } catch (err) {
        setError(`Failed to fetch report analysis: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFileUploaded = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const response: DashboardDetailsResponse =
        await apiClient.processStatementFile(file);

      if (!response?.ReportAnalysis) {
        throw new Error("Failed to process file");
      }

      setReportAnalysis(response.ReportAnalysis);
    } catch (error) {
      console.error("Error processing file:", error);
      setError("Failed to process the uploaded file");
    } finally {
      setLoading(false);
    }
  };

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
      <main className="dashboard">
        <div className="dashboard__upload">
          <p className="dashboard__upload-title">
            Upload your bank statement to get started
          </p>
          <FileUpload
            onFileUploaded={handleFileUploaded}
            acceptedFileTypes=".csv"
          />
        </div>
      </main>
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
    <main className="dashboard">
      {/* File Upload */}
      <div className="dashboard__upload">
        <p className="dashboard__upload-title">Upload a new bank statement</p>
        <FileUpload
          onFileUploaded={handleFileUploaded}
          acceptedFileTypes=".csv"
        />
      </div>

      {/* Metric Cards */}
      <MetricCards
        totalIncome={reportAnalysis.TotalIncome}
        totalExpenses={reportAnalysis.TotalExpenses}
        totalSavings={reportAnalysis.TotalSavings}
      />

      {/* Charts */}
      <div className="dashboard__charts">
        <div className="chart-card">
          <h2 className="chart-card__title">{monthlySummary.month} Overview</h2>
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

      {/* Top Spending Categories */}
      <TopCategories categories={topCategories} />
    </main>
  );
}
