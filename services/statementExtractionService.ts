import fs from "fs";
import path from "path";
import { utils } from "../utils/utils";
import { IStatementExtractionService } from "./IstatementExtractionService";

export class StatementExtractionService implements IStatementExtractionService {
  StatementExtractionService() {

  }

  async getCsvFile(): Promise<string> {
    const inputsDir =  path.join(__dirname, "../inputs");
    const files = await fs.readdirSync(inputsDir);
    const csvFile = files.find((file) => file.endsWith(".csv"));

    if (!csvFile) {
      throw new Error("No CSV file found in inputs folder");
    }

    return path.join(inputsDir, csvFile);
  }

  async extractCsvContents(filePath: string): Promise<string[][]> {
    const fileContent = await fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.trim().split("\n");
    const data = lines.map((line) =>
      line.split(",").map((cell) => cell.trim())
    );

    return data;
  }

  async getInformationFromStatement(filePath?: string): Promise<string[][]> {
    let csvPath: string;
    if (filePath) {
      csvPath = filePath;
    } else {
      csvPath = await this.getCsvFile();
    }
    const csvData = await this.extractCsvContents(csvPath);
    const filteredData = utils.filterCsvData(csvData, 6);

    return filteredData;
  }
}
