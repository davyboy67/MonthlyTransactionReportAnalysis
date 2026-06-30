import { StatementDataObject, StatementExtractionService } from "../src/services/statementExtractionService";

describe("StatementExtractionService (unit)", () => {
  let service: StatementExtractionService;

  beforeEach(() => {
    service = new StatementExtractionService();
  });

  describe("extractCsvContents", () => {
    it("should parse a CSV buffer into a trimmed 2D array", async () => {
      const csv = "a, b ,c\n d ,e,f";
      const result = await service.extractCsvContents("", Buffer.from(csv));

      expect(result).toEqual([
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    it("should trim surrounding whitespace/newlines before splitting", async () => {
      const csv = "\n\nx,y\n\n";
      const result = await service.extractCsvContents("", Buffer.from(csv));

      // leading/trailing blank lines are trimmed; an interior blank line would remain
      expect(result[0]).toEqual(["x", "y"]);
    });
  });

  describe("getStatementData", () => {
    it("should skip the first 6 header/metadata rows from a buffer", async () => {
      const lines = [
        "meta1", "meta2", "meta3", "meta4", "meta5", "meta6",
        "2026-02-10,-50,ref,Groceries",
        "2026-02-11,-30,ref,Fuel",
      ].join("\n");

      const result = await service.getStatementData({
        fileBuffer: Buffer.from(lines),
      } as StatementDataObject);

      expect(result).toHaveLength(2);
      expect(result[0][0]).toBe("2026-02-10");
    });
  });

  describe("compileTransactionList", () => {
    const header = ["Date", "Amount", "Balance", "Description"];

    it("should parse rows into transactions, skipping the header", async () => {
      const data = [
        header,
        ["2026-02-10", "-50.75", "1000", "Groceries"],
        ["2026-02-11", "2500", "3500", "Salary"],
      ];

      const result = await service.compileTransactionList(data);

      expect(result).toHaveLength(2);
      expect(result[0].Description).toBe("Groceries");
      expect(result[0].Amount).toBe(-50.75);
      expect(result[1].Amount).toBe(2500);
    });

    it("should parse decimal amounts accurately", async () => {
      const data = [header, ["2026-02-10", "-1234.56", "0", "Big spend"]];

      const result = await service.compileTransactionList(data);

      expect(result[0].Amount).toBeCloseTo(-1234.56, 2);
    });

    it("should derive a short month name from the date", async () => {
      const data = [header, ["2026-02-10", "-1", "0", "x"]];

      const result = await service.compileTransactionList(data);

      expect(result[0].Month).toBe("Feb");
    });

    it("should yield NaN for a non-numeric amount (documents parseFloat behaviour)", async () => {
      const data = [header, ["2026-02-10", "not-a-number", "0", "x"]];

      const result = await service.compileTransactionList(data);

      expect(Number.isNaN(result[0].Amount)).toBe(true);
    });

    it("should return an empty list for an empty array", async () => {
      const result = await service.compileTransactionList([]);

      expect(result).toEqual([]);
    });

    it("should return an empty list when only a header row is present", async () => {
      const result = await service.compileTransactionList([header]);

      expect(result).toEqual([]);
    });
  });
});
