import { ITransaction } from "./ITransaction";

export interface IReportAnalysis {
  date: Date;
  totalIncome: number;
  totalExpenses: number;
  categorySummary: ITransactionSummaryItem[];
}

export interface ITransactionSummaryItem {
    category: string;
    merchants?: string[];
    totalAmount: number;
    transactions: ITransaction[];
}