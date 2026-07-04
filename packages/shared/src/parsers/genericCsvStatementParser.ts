import { ITransaction, TransactionType } from "../models/ITransaction";
import { UnsupportedStatementFormatError } from "../requestResponseModels/errorModels";
import { parseAmount, parseStatementDate } from "../utils/valueParsing";
import { IBankStatementParser } from "./IBankStatementParser";

/**
 * Fallback parser for statements without a dedicated bank parser (Investec,
 * Nedbank, converter-produced Capitec/Discovery/TymeBank exports, ...).
 * Finds the header row by column-name synonyms and handles both single
 * signed-amount layouts and separate debit/credit (money out/in) columns.
 * Detection confidence is deliberately below the bank-specific parsers'.
 */
export class GenericCsvStatementParser implements IBankStatementParser {
  readonly bankName = "Generic CSV";

  private static readonly HEADER_SCAN_LIMIT = 20;

  private static readonly SYNONYMS: Record<string, string[]> = {
    date: ["date", "transaction date", "posting date", "effective date", "value date"],
    description: [
      "description",
      "transaction description",
      "narrative",
      "details",
      "transaction details",
      "reference",
      "notes",
    ],
    amount: ["amount", "transaction amount", "value"],
    debit: ["debit", "debit amount", "money out", "amount out", "withdrawals"],
    credit: ["credit", "credit amount", "money in", "amount in", "deposits"],
  };

  detect(rows: string[][]): number {
    return this.findHeader(rows) ? 0.5 : 0;
  }

  parse(rows: string[][]): ITransaction[] {
    const header = this.findHeader(rows);
    if (!header) {
      throw new UnsupportedStatementFormatError(
        "no recognisable column headers (date + amount or debit/credit) found",
      );
    }
    const { index, columns } = header;

    const transactions: ITransaction[] = [];
    rows.slice(index + 1).forEach((row) => {
      const date = parseStatementDate(row[columns.date]);
      if (!date) {
        return; // metadata/footer/blank row
      }

      const amount = this.readAmount(row, columns);
      if (amount === null) {
        return; // date-like row without a usable amount
      }

      transactions.push({
        Month: date.toLocaleString("en-US", { month: "short" }),
        Date: date,
        Description: (columns.description !== undefined && row[columns.description]) || "",
        Amount: amount,
        Category: "",
        Merchant: "",
        Type: TransactionType.Expense, // reclassified during analysis
      });
    });

    return transactions;
  }

  /** Single signed column, or credit minus debit when the layout splits them. */
  private readAmount(
    row: string[],
    columns: ColumnMap,
  ): number | null {
    if (columns.amount !== undefined) {
      const amount = parseAmount(row[columns.amount]);
      return Number.isNaN(amount) ? null : amount;
    }

    const debitRaw = columns.debit !== undefined ? row[columns.debit] : "";
    const creditRaw = columns.credit !== undefined ? row[columns.credit] : "";
    if (!debitRaw && !creditRaw) {
      return null;
    }

    // debit cells are sometimes already negative; normalise before signing
    const debit = debitRaw ? Math.abs(parseAmount(debitRaw)) : 0;
    const credit = creditRaw ? Math.abs(parseAmount(creditRaw)) : 0;
    const amount = credit - debit;
    return Number.isNaN(amount) ? null : amount;
  }

  private findHeader(rows: string[][]): { index: number; columns: ColumnMap } | null {
    const limit = Math.min(rows.length, GenericCsvStatementParser.HEADER_SCAN_LIMIT);
    for (let i = 0; i < limit; i++) {
      const columns = this.mapColumns(rows[i]);
      if (
        columns !== null &&
        (columns.amount !== undefined || columns.debit !== undefined || columns.credit !== undefined)
      ) {
        return { index: i, columns };
      }
    }
    return null;
  }

  private mapColumns(headerRow: string[]): ColumnMap | null {
    const names = headerRow.map((cell) => cell.toLowerCase().trim());
    // synonym order sets priority, so "description" beats "reference"
    // even when the reference column comes first in the file
    const find = (field: string): number | undefined => {
      for (const synonym of GenericCsvStatementParser.SYNONYMS[field]) {
        const index = names.indexOf(synonym);
        if (index !== -1) {
          return index;
        }
      }
      return undefined;
    };

    const date = find("date");
    if (date === undefined) {
      return null;
    }
    return {
      date,
      description: find("description"),
      amount: find("amount"),
      debit: find("debit"),
      credit: find("credit"),
    };
  }
}

type ColumnMap = {
  date: number;
  description?: number;
  amount?: number;
  debit?: number;
  credit?: number;
};
