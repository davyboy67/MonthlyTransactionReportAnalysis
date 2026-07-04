import { ITransaction } from "../models/ITransaction";

export interface IBankStatementParser {
  /** Display name of the bank whose statement layout this parser handles. */
  readonly bankName: string;

  /**
   * Inspect the raw CSV rows and return a match confidence:
   * 0 = not this bank's format, higher = stronger match. The registry picks
   * the parser with the highest non-zero score.
   */
  detect(rows: string[][]): number;

  /** Convert the raw CSV rows into normalised transactions (signed amounts). */
  parse(rows: string[][]): ITransaction[];
}
