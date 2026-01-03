import { DBTransaction } from "./dbTransaction";

export interface DbReportAnalysis {
    id: string;
    report_date: Date;
    totalIncome: number;
    totalExpenses: number;
}