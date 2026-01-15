import { get } from "http";
import { ITransaction } from "./ITransaction";

export interface SaveReportAnalysisRequest {
  reportAnalysis: IReportAnalysis;
}

export interface IReportAnalysis {
  date: Date;
  totalIncome: number;
  totalExpenses: number;
  categorySummaries: ITransactionSummaryItem[];
}

export interface ITransactionSummaryItem {
    categoryName: string;
    merchants?: string[];
    totalAmount: number;
    transactions: ITransaction[];
}