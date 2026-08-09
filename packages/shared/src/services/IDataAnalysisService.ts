import { IReportAnalysis } from '../models/IReportAnalysis';
import { ITransaction } from '../models/ITransaction';

/** Day-of-month pay dates bounding a cycle: the previous month opens it, the target closes it. */
export interface CyclePayDays {
  previousMonth: number;
  targetMonth: number;
}

export interface IDataAnalysisService {
  analyseTransactions(
    targetMonth: number,
    targetYear: number,
    transactions: ITransaction[],
    payDays: CyclePayDays
  ): Promise<IReportAnalysis>;
}
