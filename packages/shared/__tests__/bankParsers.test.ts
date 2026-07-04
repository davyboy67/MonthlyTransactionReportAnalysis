import { parseAmount, parseStatementDate } from "../src/utils/valueParsing";
import { AbsaStatementParser } from "../src/parsers/absaStatementParser";
import { GenericCsvStatementParser } from "../src/parsers/genericCsvStatementParser";
import { StatementParserRegistry } from "../src/parsers/statementParserRegistry";
import { UnsupportedStatementFormatError } from "../src/requestResponseModels/errorModels";

describe("parseStatementDate", () => {
  it.each([
    ["2026-02-10", 2026, 1, 10],
    ["2026/02/10", 2026, 1, 10],
    ["10/02/2026", 2026, 1, 10], // day-first, SA convention
    ["10-02-2026", 2026, 1, 10],
    ["10 Feb 2026", 2026, 1, 10],
    ["10 February 2026", 2026, 1, 10],
  ])("should parse %s", (raw, year, month, day) => {
    const date = parseStatementDate(raw);
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(year);
    expect(date!.getMonth()).toBe(month);
    expect(date!.getDate()).toBe(day);
  });

  it.each(["", "Closing balance", "31/02/2026", "10 Foo 2026", "123456"])(
    "should return null for non-date %s",
    (raw) => {
      expect(parseStatementDate(raw)).toBeNull();
    },
  );
});

describe("parseAmount", () => {
  it.each([
    ["250.00", 250],
    ["-250.00", -250],
    ["R 1 234.56", 1234.56],
    ["1,234.56", 1234.56],
    ["1234,56", 1234.56], // decimal comma
    ["(250.00)", -250],
    ["250.00 Cr", 250],
    ["250.00 Dr", -250],
  ])("should parse %s as %d", (raw, expected) => {
    expect(parseAmount(raw)).toBeCloseTo(expected, 2);
  });

  it.each(["", "not-a-number", "12.34.56"])("should return NaN for %s", (raw) => {
    expect(Number.isNaN(parseAmount(raw))).toBe(true);
  });
});

describe("AbsaStatementParser", () => {
  const parser = new AbsaStatementParser();
  const rows = [
    ["Date", "Description", "Amount", "Balance"],
    ["10/02/2026", "SALARY", "25000.00", "30000.00"],
    ["11/02/2026", "GROCERIES", "-1250.50", "28749.50"],
  ];

  it("should detect the documented ABSA header", () => {
    expect(parser.detect(rows)).toBe(1);
  });

  it("should not detect the FNB column order", () => {
    expect(parser.detect([["Date", "Amount", "Balance", "Description"]])).toBe(0);
  });

  it("should parse day-first dates and signed amounts", () => {
    const result = parser.parse(rows);

    expect(result).toHaveLength(2);
    expect(result[0].Date.getDate()).toBe(10);
    expect(result[0].Month).toBe("Feb");
    expect(result[0].Amount).toBe(25000);
    expect(result[1].Description).toBe("GROCERIES");
    expect(result[1].Amount).toBe(-1250.5);
  });
});

describe("GenericCsvStatementParser", () => {
  const parser = new GenericCsvStatementParser();

  it("should parse a money in/out layout (TymeBank-style)", () => {
    const rows = [
      ["Date", "Description", "Money In", "Money Out", "Balance"],
      ["10/02/2026", "Salary", "25000.00", "", "30000.00"],
      ["11/02/2026", "Groceries", "", "1250.50", "28749.50"],
    ];

    const result = parser.parse(rows);

    expect(result).toHaveLength(2);
    expect(result[0].Amount).toBe(25000);
    expect(result[1].Amount).toBe(-1250.5);
  });

  it("should parse a debit/credit layout and normalise pre-signed debits", () => {
    const rows = [
      ["Transaction Date", "Details", "Debit", "Credit"],
      ["2026-02-10", "Card purchase", "-99.99", ""],
      ["2026-02-11", "Refund", "", "50.00"],
    ];

    const result = parser.parse(rows);

    expect(result[0].Amount).toBe(-99.99);
    expect(result[0].Description).toBe("Card purchase");
    expect(result[1].Amount).toBe(50);
  });

  it("should skip metadata and footer rows that carry no date or amount", () => {
    const rows = [
      ["Account statement for 123456789"],
      ["Date", "Reference", "Amount"],
      ["10 Feb 2026", "EFT PAYMENT", "-500.00"],
      ["Closing balance", "", "12000.00"],
      [""],
    ];

    const result = parser.parse(rows);

    expect(result).toHaveLength(1);
    expect(result[0].Description).toBe("EFT PAYMENT");
  });

  it("should prefer a description column over an earlier reference column", () => {
    const rows = [
      ["Date", "Reference", "Description", "Amount"],
      ["2026-02-10", "REF001", "Groceries", "-100.00"],
    ];

    expect(parser.parse(rows)[0].Description).toBe("Groceries");
  });

  it("should not detect a file without date and amount headers", () => {
    expect(parser.detect([["foo", "bar"], ["1", "2"]])).toBe(0);
  });
});

describe("StatementParserRegistry with all parsers", () => {
  const registry = new StatementParserRegistry();

  it("should resolve an ABSA statement to the ABSA parser, not the generic one", () => {
    const rows = [["Date", "Description", "Amount", "Balance"]];

    expect(registry.resolve(rows).bankName).toBe("ABSA");
  });

  it("should resolve an unknown debit/credit layout to the generic parser", () => {
    const rows = [["Date", "Details", "Debit", "Credit", "Balance"]];

    expect(registry.resolve(rows).bankName).toBe("Generic CSV");
  });

  it("should still resolve the FNB layout to the FNB parser", () => {
    const rows = [["Date", "Amount", "Balance", "Description"]];

    expect(registry.resolve(rows).bankName).toBe("FNB");
  });

  it("should throw for a statement no parser recognises", () => {
    expect(() => registry.resolve([["just", "junk"]])).toThrow(
      UnsupportedStatementFormatError,
    );
  });
});
