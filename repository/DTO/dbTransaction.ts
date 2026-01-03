import { DbReportAnalysis } from "./dbReportAnalysis";

export interface DBTransaction {
    id: number;
    reportAnalysisId: number;
    reportAnalysis: DbReportAnalysis;
    date: Date;
    description: string;
    amount: number;
    category: string;
    merchant: string;
}