import fs from "fs";
import { parseCsv } from "../utils/csv";
import { StatementParserRegistry } from "../parsers/statementParserRegistry";
import {
  ExtractedStatement,
  IStatementExtractionService,
} from "./IstatementExtractionService";

export type StatementDataObject = {
  filePath: string;
  fileBuffer?: Buffer;
};

export class StatementExtractionService implements IStatementExtractionService {
  constructor(
    private readonly parserRegistry: StatementParserRegistry = new StatementParserRegistry(),
  ) {}

  async extractTransactions(
    object: StatementDataObject,
  ): Promise<ExtractedStatement> {
    const content = object?.fileBuffer
      ? object.fileBuffer.toString("utf-8")
      : fs.readFileSync(object.filePath, "utf-8");

    const rows = parseCsv(content);
    const parser = this.parserRegistry.resolve(rows);

    return {
      bankName: parser.bankName,
      transactions: parser.parse(rows),
    };
  }
}
