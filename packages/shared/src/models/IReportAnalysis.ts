import type { ITransaction } from "./ITransaction";

export interface SaveReportAnalysisRequest {
  ReportAnalysis: IReportAnalysis;
}

export interface IReportAnalysis {
  Date: Date;
  TotalIncome: number;
  TotalExpenses: number;
  CategorySummaries: ICategorySummary[];
}

export interface ICategorySummary {
    CategoryName: string;
    Merchants?: string[];
    TotalAmount: number;
    Transactions: ITransaction[];
}