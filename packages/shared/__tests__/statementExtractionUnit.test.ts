import { parseCsv } from "../src/utils/csv";
import { FnbStatementParser } from "../src/parsers/fnbStatementParser";
import { StatementParserRegistry } from "../src/parsers/statementParserRegistry";
import { StatementExtractionService } from "../src/services/statementExtractionService";
import { UnsupportedStatementFormatError } from "../src/requestResponseModels/errorModels";

describe("parseCsv", () => {
  it("should parse rows into a trimmed 2D array", () => {
    expect(parseCsv("a, b ,c\n d ,e,f")).toEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
  });

  it("should keep commas inside quoted cells", () => {
    expect(parseCsv('2026-02-10,-50,"PAYMENT, REF 123",x')).toEqual([
      ["2026-02-10", "-50", "PAYMENT, REF 123", "x"],
    ]);
  });

  it("should unescape doubled quotes inside quoted cells", () => {
    expect(parseCsv('"say ""hi""",b')).toEqual([['say "hi"', "b"]]);
  });

  it("should handle CRLF line endings", () => {
    expect(parseCsv("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("should strip a UTF-8 BOM", () => {
    expect(parseCsv("\uFEFFa,b")).toEqual([["a", "b"]]);
  });

  it("should trim surrounding blank lines but keep interior ones", () => {
    const rows = parseCsv("\n\nx,y\n\nz,w\n\n");
    expect(rows).toEqual([["x", "y"], [""], ["z", "w"]]);
  });
});

describe("FnbStatementParser", () => {
  const parser = new FnbStatementParser();
  const header = ["Date", "Amount", "Balance", "Description"];

  const withMetadata = (dataRows: string[][]): string[][] => [
    ["ACCOUNT TRANSACTION HISTORY"],
    [""],
    ["Name:", "John", "Doe"],
    ["Account:", "12345678901", "[Easy Account]"],
    [""],
    header,
    ...dataRows,
  ];

  describe("detect", () => {
    it("should match when the FNB header row is present after metadata", () => {
      expect(parser.detect(withMetadata([]))).toBeGreaterThan(0);
    });

    it("should not match a different column layout", () => {
      const rows = [["Date", "Description", "Debit", "Credit", "Balance"]];
      expect(parser.detect(rows)).toBe(0);
    });

    it("should not match an empty file", () => {
      expect(parser.detect([[""]])).toBe(0);
    });
  });

  describe("parse", () => {
    it("should parse rows after the header into transactions", () => {
      const rows = withMetadata([
        ["2025/12/24", "500.00", "15000.50", "DEPOSIT SALARY PAYMENT"],
        ["2025/12/23", "-250.00", "14500.50", "PURCH Grocery Store"],
      ]);

      const result = parser.parse(rows);

      expect(result).toHaveLength(2);
      expect(result[0].Description).toBe("DEPOSIT SALARY PAYMENT");
      expect(result[0].Amount).toBe(500);
      expect(result[0].Month).toBe("Dec");
      expect(result[1].Amount).toBe(-250);
    });

    it("should parse decimal amounts accurately", () => {
      const rows = withMetadata([["2026/02/10", "-1234.56", "0", "Big spend"]]);

      expect(parser.parse(rows)[0].Amount).toBeCloseTo(-1234.56, 2);
    });

    it("should skip short/blank rows between transactions", () => {
      const rows = withMetadata([
        ["2026/02/10", "-1", "0", "x"],
        [""],
        ["2026/02/11", "-2", "0", "y"],
      ]);

      expect(parser.parse(rows)).toHaveLength(2);
    });

    it("should yield NaN for a non-numeric amount (documents parseFloat behaviour)", () => {
      const rows = withMetadata([["2026/02/10", "not-a-number", "0", "x"]]);

      expect(Number.isNaN(parser.parse(rows)[0].Amount)).toBe(true);
    });

    it("should return an empty list when only the header is present", () => {
      expect(parser.parse(withMetadata([]))).toEqual([]);
    });

    it("should throw when the header row is missing", () => {
      expect(() => parser.parse([["nope"]])).toThrow(UnsupportedStatementFormatError);
    });
  });
});

describe("StatementParserRegistry", () => {
  it("should resolve an FNB-shaped statement to the FNB parser", () => {
    const registry = new StatementParserRegistry();
    const rows = [["Date", "Amount", "Balance", "Description"]];

    expect(registry.resolve(rows).bankName).toBe("FNB");
  });

  it("should throw UnsupportedStatementFormatError when nothing matches", () => {
    const registry = new StatementParserRegistry();

    expect(() => registry.resolve([["random", "junk"]])).toThrow(
      UnsupportedStatementFormatError,
    );
  });

  it("should prefer the parser with the highest confidence", () => {
    const weak = { bankName: "Weak", detect: () => 0.4, parse: () => [] };
    const strong = { bankName: "Strong", detect: () => 0.9, parse: () => [] };
    const registry = new StatementParserRegistry([weak, strong]);

    expect(registry.resolve([[]]).bankName).toBe("Strong");
  });
});

describe("StatementExtractionService", () => {
  it("should extract transactions from a buffer end-to-end", async () => {
    const service = new StatementExtractionService();
    const csv = [
      "ACCOUNT TRANSACTION HISTORY",
      "",
      "Name:, John, Doe",
      "Account:, 12345678901, [Easy Account]",
      "",
      "Date, Amount, Balance, Description",
      '2026/02/10, -50.75, 1000, "PURCH, Groceries"',
      "2026/02/11, 2500, 3500, Salary",
    ].join("\n");

    const result = await service.extractTransactions({
      filePath: "",
      fileBuffer: Buffer.from(csv),
    });

    expect(result.bankName).toBe("FNB");
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].Description).toBe("PURCH, Groceries");
    expect(result.transactions[0].Amount).toBe(-50.75);
  });

  it("should throw UnsupportedStatementFormatError for an unrecognised file", async () => {
    const service = new StatementExtractionService();

    await expect(
      service.extractTransactions({
        filePath: "",
        fileBuffer: Buffer.from("some,random\ncsv,file"),
      }),
    ).rejects.toThrow(UnsupportedStatementFormatError);
  });
});
