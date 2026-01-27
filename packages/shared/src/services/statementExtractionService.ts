import fs from "fs";
import path from "path";
import { utils } from "../utils/utils";
import { IStatementExtractionService } from "./IstatementExtractionService";
import { ITransaction } from "../models/ITransaction";


export type StatementDataObject = {
  filePath: string;
  fileBuffer: Buffer;
};
export class StatementExtractionService implements IStatementExtractionService {

  statementObject?: StatementDataObject;

  private async getCsvFile(): Promise<string> {
    const inputsDir =  path.join(__dirname, "../inputs");
    const files = await fs.readdirSync(inputsDir);
    const csvFile = files.find((file) => file.endsWith(".csv"));

    if (!csvFile) {
      throw new Error("No CSV file found in inputs folder");
    }

    return path.join(inputsDir, csvFile);
  }

  async extractCsvContents(filePath: string, fileBuffer?: Buffer): Promise<string[][]> {
    let fileContent = "";

    if (fileBuffer) {
      fileContent = fileBuffer.toString("utf-8");
    }
    else {
        fileContent = await fs.readFileSync(filePath, "utf-8");
    }
    
    const lines = fileContent.trim().split("\n");
    const data = lines.map((line) =>
      line.split(",").map((cell) => cell.trim())
    );

    return data;
  }

  async getStatementData(object: StatementDataObject): Promise<string[][]> {
    let csvData: string[][] = [];
    if (object?.filePath) {
      csvData = await this.extractCsvContents(object.filePath);
    } else if (object?.fileBuffer) {
      csvData = await this.extractCsvContents("", object.fileBuffer);
    }
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
        Month: date.toLocaleString('en-US', { month: 'short' }),
        Date: date,
        Description: row[3],
        Amount: parseFloat(row[1]),
        //we'll derive category and merchant later
        Category: "",
        Merchant: "",
      }
      transactions.push(transaction);
    })

    return transactions;
  }
}
