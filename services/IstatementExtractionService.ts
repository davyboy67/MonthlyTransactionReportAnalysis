export interface IStatementExtractionService {
  getInformationFromStatement(): string[][];
  getCsvFile(): string;
  extractCsvContents(filePath: string): string[][];
  getInformationFromStatement(): string[][];
}
