import fs from "fs";
import path from "path";
import { utils } from "../utils/utils";
import { IStatementExtractionService } from "./IstatementExtractionService";
import { ITransaction } from "../models/ITransaction";

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

  async getStatementData(filePath?: string): Promise<string[][]> {
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

  async compileTransactionList(data: string[][]): Promise<ITransaction[]> {
    if (data?.length < 1) {
      return [];
    }

    let transactions: ITransaction[] = [];

    data.slice(1).forEach(row => {
      const date = new Date(row[0]);
      date.setHours(0, 0, 0, 0);
      
      let transaction: ITransaction = {
        month: date.toLocaleString('en-US', { month: 'short' }),
        date: date,
        description: row[3],
        amount: parseFloat(row[1]),
        //we'll derive category and merchant later
        category: "",
        merchant: "",
      }
      transactions.push(transaction);
    })

    return transactions;
  }
}
