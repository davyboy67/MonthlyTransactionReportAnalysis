import { IReportAnalysis } from '../models/IReportAnalysis';
export declare const apiClient: {
    saveReportAnalysis: (reportAnalysis: IReportAnalysis) => Promise<void>;
    RetrieveReportAnalysis: (date: Date, id?: number) => Promise<any>;
    processStatementFile: (file: File) => Promise<any>;
};
//# sourceMappingURL=apiClient.d.ts.map