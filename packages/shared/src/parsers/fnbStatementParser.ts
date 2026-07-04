import { ITransaction, TransactionType } from "../models/ITransaction";
import { UnsupportedStatementFormatError } from "../requestResponseModels/errorModels";
import { IBankStatementParser } from "./IBankStatementParser";

/**
 * FNB CSV statement layout: a few account-metadata rows, then a
 * "Date, Amount, Balance, Description" header row followed by transactions.
 * Amounts are signed (negative = debit); dates are yyyy/mm/dd.
 */
export class FnbStatementParser implements IBankStatementParser {
  readonly bankName = "FNB";

  private static readonly HEADER = ["date", "amount", "balance", "description"];
  private static readonly HEADER_SCAN_LIMIT = 15;

  detect(rows: string[][]): number {
    return this.findHeaderRow(rows) === -1 ? 0 : 1;
  }

  parse(rows: string[][]): ITransaction[] {
    const headerIndex = this.findHeaderRow(rows);
    if (headerIndex === -1) {
      throw new UnsupportedStatementFormatError(
        "FNB header row (Date, Amount, Balance, Description) not found",
      );
    }

    const transactions: ITransaction[] = [];
    rows.slice(headerIndex + 1).forEach((row) => {
      if (row.length < 4) {
        return; // blank/metadata row
      }

      const date = new Date(row[0]);
      date.setHours(0, 0, 0, 0);

      transactions.push({
        Month: date.toLocaleString("en-US", { month: "short" }),
        Date: date,
        Description: row[3],
        Amount: parseFloat(row[1]),
        Category: "",
        Merchant: "",
        Type: TransactionType.Expense, // reclassified during analysis
      });
    });

    return transactions;
  }

  private findHeaderRow(rows: string[][]): number {
    const limit = Math.min(rows.length, FnbStatementParser.HEADER_SCAN_LIMIT);
    for (let i = 0; i < limit; i++) {
      const cells = rows[i].map((cell) => cell.toLowerCase());
      if (
        cells.length >= FnbStatementParser.HEADER.length &&
        FnbStatementParser.HEADER.every((name, j) => cells[j] === name)
      ) {
        return i;
      }
    }
    return -1;
  }
}
