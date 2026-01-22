import { IStatementExtractionService } from "./IstatementExtractionService";
import { ITransaction } from "../models/ITransaction";
export type StatementDataObject = {
    filePath: string;
    fileBuffer: Buffer;
};
export declare class StatementExtractionService implements IStatementExtractionService {
    statementObject?: StatementDataObject;
    private getCsvFile;
    extractCsvContents(filePath: string, fileBuffer?: Buffer): Promise<string[][]>;
    getStatementData(object: StatementDataObject): Promise<string[][]>;
    compileTransactionList(data: string[][]): Promise<ITransaction[]>;
}
//# sourceMappingURL=statementExtractionService.d.ts.map