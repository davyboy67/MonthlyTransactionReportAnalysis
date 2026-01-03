import { IReportAnalysis } from "../models/IReportAnalysis";
import { ITransaction } from "../models/ITransaction";
import { DbReportAnalysis } from "./DTO/dbReportAnalysis";

export interface IReportAnalysisRepo {
    getReportAnalysis(reportDate: Date): Promise<DbReportAnalysis>;
    saveReportAnalysis(reportAnalysis: IReportAnalysis): Promise<void>;
}