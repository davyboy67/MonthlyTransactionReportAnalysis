import { IReportAnalysis } from "../models/IReportAnalysis";
import { ITransaction } from "../models/ITransaction";
import { ITransactionInfoHandler } from "../utils/ITransactionInfoHandler";
import { IDataAnalysisService } from "./IDataAnalysisService";
export declare class DataAnalysisService implements IDataAnalysisService {
    private readonly _transactionInfoHandler;
    constructor(transactionInfoHandler: ITransactionInfoHandler);
    private enhanceTransactionInfo;
    private createReportAnalysis;
    analyseTransactions(transactions: ITransaction[]): Promise<IReportAnalysis>;
}
//# sourceMappingURL=dataAnalysisService.d.ts.map