import { IReportAnalysis } from "../models/IReportAnalysis";
import { ITransaction } from "../models/ITransaction";

export interface IDataAnalysisService {
    analyseTransactions(transactions: ITransaction[]): Promise<IReportAnalysis>;
}