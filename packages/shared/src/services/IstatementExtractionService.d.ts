import { ITransaction } from "../models/ITransaction";
import { StatementDataObject } from "./statementExtractionService";
export interface IStatementExtractionService {
    extractCsvContents(filePath: string): Promise<string[][]>;
    getStatementData(object: StatementDataObject): Promise<string[][]>;
    compileTransactionList(data: string[][]): Promise<ITransaction[]>;
}
//# sourceMappingURL=IstatementExtractionService.d.ts.map