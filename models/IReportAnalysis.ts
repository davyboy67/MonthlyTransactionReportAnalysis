import { get } from "http";
import { ITransaction } from "./ITransaction";

export interface SaveReportAnalysisRequest {
  reportAnalysis: IReportAnalysis;
}

export interface IReportAnalysis {
  Date: Date;
  TotalIncome: number;
  TotalExpenses: number;
  CategorySummaries: ITransactionSummaryItem[];
}

export interface ITransactionSummaryItem {
    CategoryName: string;
    Merchants?: string[];
    TotalAmount: number;
    Transactions: ITransaction[];
}