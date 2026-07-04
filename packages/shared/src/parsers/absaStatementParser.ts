import { ITransaction, TransactionType } from "../models/ITransaction";
import { UnsupportedStatementFormatError } from "../requestResponseModels/errorModels";
import { parseAmount, parseStatementDate } from "../utils/valueParsing";
import { IBankStatementParser } from "./IBankStatementParser";

/**
 * ABSA CSV statement layout: "Date, Description, Amount, Balance" header on
 * the first line, one signed-amount transaction per row.
 */
export class AbsaStatementParser implements IBankStatementParser {
  readonly bankName = "ABSA";

  private static readonly HEADER = ["date", "description", "amount", "balance"];
  private static readonly HEADER_SCAN_LIMIT = 5;

  detect(rows: string[][]): number {
    return this.findHeaderRow(rows) === -1 ? 0 : 1;
  }

  parse(rows: string[][]): ITransaction[] {
    const headerIndex = this.findHeaderRow(rows);
    if (headerIndex === -1) {
      throw new UnsupportedStatementFormatError(
        "ABSA header row (Date, Description, Amount, Balance) not found",
      );
    }

    const transactions: ITransaction[] = [];
    rows.slice(headerIndex + 1).forEach((row) => {
      const date = parseStatementDate(row[0]);
      if (!date || row.length < 3) {
        return; // blank/footer row
      }

      transactions.push({
        Month: date.toLocaleString("en-US", { month: "short" }),
        Date: date,
        Description: row[1],
        Amount: parseAmount(row[2]),
        Category: "",
        Merchant: "",
        Type: TransactionType.Expense, // reclassified during analysis
      });
    });

    return transactions;
  }

  private findHeaderRow(rows: string[][]): number {
    const limit = Math.min(rows.length, AbsaStatementParser.HEADER_SCAN_LIMIT);
    for (let i = 0; i < limit; i++) {
      const cells = rows[i].map((cell) => cell.toLowerCase());
      if (
        cells.length >= AbsaStatementParser.HEADER.length &&
        AbsaStatementParser.HEADER.every((name, j) => cells[j] === name)
      ) {
        return i;
      }
    }
    return -1;
  }
}
