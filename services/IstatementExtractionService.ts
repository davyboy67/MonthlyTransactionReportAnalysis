import { ITransaction } from "../models/ITransaction";

export interface IStatementExtractionService {
  getStatementData(): Promise<string[][]>;
  getCsvFile(): Promise<string>;
  extractCsvContents(filePath: string): Promise<string[][]>;
  getStatementData(filePath?: string): Promise<string[][]>;
  compileTransactionList(data: string[][]): Promise<ITransaction[]>
}
