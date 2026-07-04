import { UnsupportedStatementFormatError } from "../requestResponseModels/errorModels";
import { FnbStatementParser } from "./fnbStatementParser";
import { IBankStatementParser } from "./IBankStatementParser";

export class StatementParserRegistry {
  private readonly parsers: IBankStatementParser[];

  constructor(parsers: IBankStatementParser[] = [new FnbStatementParser()]) {
    this.parsers = [...parsers];
  }

  register(parser: IBankStatementParser): void {
    this.parsers.push(parser);
  }

  get supportedBanks(): string[] {
    return this.parsers.map((parser) => parser.bankName);
  }

  /** Pick the parser with the highest detection confidence, or throw. */
  resolve(rows: string[][]): IBankStatementParser {
    let best: IBankStatementParser | undefined;
    let bestScore = 0;

    for (const parser of this.parsers) {
      const score = parser.detect(rows);
      if (score > bestScore) {
        best = parser;
        bestScore = score;
      }
    }

    if (!best) {
      throw new UnsupportedStatementFormatError(
        `statement did not match any supported bank (${this.supportedBanks.join(", ")})`,
      );
    }
    return best;
  }
}
