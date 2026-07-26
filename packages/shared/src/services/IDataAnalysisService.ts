import { IReportAnalysis } from '../models/IReportAnalysis';
import { ITransaction } from '../models/ITransaction';

export interface IDataAnalysisService {
  analyseTransactions(
    targetMonth: number,
    targetYear: number,
    transactions: ITransaction[]
  ): Promise<IReportAnalysis>;
}
