import { ITransaction } from "../models/ITransaction";
import { StatementDataObject } from "./statementExtractionService";

export interface ExtractedStatement {
  /** Which bank's parser matched the statement. */
  bankName: string;
  transactions: ITransaction[];
}

export interface IStatementExtractionService {
  /**
   * Parse a raw statement file (path or buffer), auto-detect the bank format,
   * and return the normalised transactions.
   * @throws UnsupportedStatementFormatError when no parser recognises the file.
   */
  extractTransactions(object: StatementDataObject): Promise<ExtractedStatement>;
}
