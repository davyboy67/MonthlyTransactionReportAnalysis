export interface IStatementExtractionService {
  getInformationFromStatement(): Promise<string[][]>;
  getCsvFile(): Promise<string>;
  extractCsvContents(filePath: string): Promise<string[][]>;
  getInformationFromStatement(filePath?: string): Promise<string[][]>;
}
