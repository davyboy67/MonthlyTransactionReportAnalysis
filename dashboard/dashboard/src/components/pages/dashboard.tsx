import { useEffect, useState } from "react";
import { apiClient } from "../../../../../services/apiClient";
import type { ICategorySummary, IMonthlySummary } from "../../types";
import { CategorySummary } from "../organisms/categorySummary";
import { MonthlyOverview } from "../organisms/monthlyOverview";
import type { IReportAnalysis } from "../../../../../models/IReportAnalysis";
import { FileUpload } from "../molecules/fileUpload";

interface DashboardDetailsResponse {
  ReportAnalysis: IReportAnalysis;
}

export function Dashboard() {
  const [reportAnalysis, setReportAnalysis] = useState<IReportAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response: DashboardDetailsResponse = await apiClient.RetrieveReportAnalysis(new Date("2026-01-14"));
        if (!response?.ReportAnalysis) {
          throw new Error("No report analysis data received");
        }
        console.log("Fetched report analysis>>:", response);
        setReportAnalysis(response.ReportAnalysis);
      } catch (err) {
        setError("Failed to fetch report analysis");
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
      
      // Process the uploaded file
      const response: DashboardDetailsResponse = await apiClient.processStatementFile(file);
      
      if (!response?.ReportAnalysis) {
        throw new Error('Failed to process file');
      }
      
      // Update the state with the new report analysis
      setReportAnalysis(response.ReportAnalysis);
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Failed to process the uploaded file');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!reportAnalysis) {
    return (<div>
            <FileUpload onFileUploaded={handleFileUploaded} />
            No data available
            </div>);
  }

  const monthlySummary: IMonthlySummary = {
    month: new Date(reportAnalysis.Date).toLocaleString('default', { month: 'long', year: 'numeric' }),
    totalIncome: reportAnalysis.TotalIncome,
    totalExpenses: reportAnalysis.TotalExpenses,
  };

  console.log(">>Report Analysis Keys:", Object.keys(reportAnalysis));
console.log(">>Report Analysis:", reportAnalysis);
console.log(">>Monthly Summary:", monthlySummary);

  const categorySummaries: ICategorySummary[] = reportAnalysis.CategorySummaries?.map(summary => ({
    name: summary.CategoryName,
    transactionCount: summary.Transactions?.length || 0,
    budget: 0, // No budget data from API
    expenditure: summary.TotalAmount,
  })) || [];

  return (
    <main className="w-100">
      <div>
        <FileUpload onFileUploaded={handleFileUploaded} acceptedFileTypes=".csv" />
      </div>
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