import { DataAnalysisService } from "../src/services/dataAnalysisService";
import { ITransactionInfoHandler } from "../src/utils/ITransactionInfoHandler";
import { ITransaction, TransactionType } from "../src/models/ITransaction";
import { apiClient } from "../src/services/apiClient";
import { NoTransactionsInPeriodError } from "../src/requestResponseModels/errorModels";

jest.mock("../src/services/apiClient", () => ({
  apiClient: {
    saveReportAnalysis: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockedSave = apiClient.saveReportAnalysis as jest.MockedFunction<
  typeof apiClient.saveReportAnalysis
>;

describe("DataAnalysisService", () => {
  let mockHandler: jest.Mocked<ITransactionInfoHandler>;

  const PAY_26 = { previousMonth: 26, targetMonth: 26 };

  // Dates are built with the local-time constructor (new Date(y, mIndex, d)) so they
  // line up with the service, which derives its date range with the same local
  // constructor. The target month
  // is passed in by the caller, so no system-clock mocking is needed.
  const makeTransaction = (
    overrides: Partial<ITransaction> = {},
  ): ITransaction => ({
    Date: new Date(2026, 1, 10), // 10 Feb 2026 (local)
    Description: "Test transaction",
    Amount: -50,
    Category: "",
    Merchant: "",
    Month: "2",
    Type: TransactionType.Expense,
    ...overrides,
  });

  beforeEach(() => {
    mockHandler = {
      resolveMerchant: jest.fn().mockReturnValue(undefined),
      resolveCategory: jest.fn().mockReturnValue("Groceries"),
    };
    jest.clearAllMocks();
  });

  describe("amount & type handling", () => {
    it("should assign Income type to positive amounts and total them", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory.mockReturnValue("Income");
      const tx = makeTransaction({ Amount: 5000 });

      const result = await service.analyseTransactions(2, 2026, [tx], PAY_26);

      expect(result.TotalIncome).toBe(5000);
      expect(result.TotalExpenses).toBe(0);
    });

    it("should assign Expense type and use the absolute amount for negatives", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Amount: -120.5 });

      const result = await service.analyseTransactions(2, 2026, [tx], PAY_26);

      expect(result.TotalExpenses).toBe(120.5);
      expect(result.TotalIncome).toBe(0);
    });

    it("should assign Savings type when resolveCategory marks it as Savings", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory.mockImplementation((t) => {
        t.Type = TransactionType.Savings;
        return "Savings";
      });
      const tx = makeTransaction({ Amount: -200 });

      const result = await service.analyseTransactions(2, 2026, [tx], PAY_26);

      expect(result.TotalSavings).toBe(200);
      expect(result.TotalExpenses).toBe(0);
    });

    it("should treat a zero amount as Income (Amount >= 0)", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory.mockReturnValue("Income");
      const tx = makeTransaction({ Amount: 0 });

      const result = await service.analyseTransactions(2, 2026, [tx], PAY_26);

      expect(result.TotalIncome).toBe(0);
      expect(result.TotalExpenses).toBe(0);
    });
  });

  describe("numeric accuracy", () => {
    it("should round each total to 2 decimal places", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Amount: -33.333 });

      const result = await service.analyseTransactions(2, 2026, [tx], PAY_26);

      expect(result.TotalExpenses).toBe(33.33);
    });

    it("should sum many small amounts without floating point drift", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      // 0.1 + 0.2 famously != 0.3 in IEEE754; rounding to cents must fix it.
      const txs = [
        makeTransaction({ Amount: -0.1, Description: "a" }),
        makeTransaction({ Amount: -0.2, Description: "b" }),
      ];

      const result = await service.analyseTransactions(2, 2026, txs, PAY_26);

      expect(result.TotalExpenses).toBe(0.3);
    });

    it("should round a sub-cent amount to two decimal places", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Amount: -10.005 });

      const result = await service.analyseTransactions(2, 2026, [tx], PAY_26);

      // 10.005 * 100 rounds up to 1001 in IEEE754, giving 10.01 — the point is the
      // result is always a clean 2-decimal currency value, never a long float.
      expect(result.TotalExpenses).toBe(10.01);
    });
  });

  describe("category summaries", () => {
    it("should group transactions into CategorySummaries by category", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory
        .mockReturnValueOnce("Food")
        .mockReturnValueOnce("Transport");
      const tx1 = makeTransaction({ Amount: -50, Description: "Grocery store" });
      const tx2 = makeTransaction({ Amount: -30, Description: "Uber" });

      const result = await service.analyseTransactions(2, 2026, [tx1, tx2], PAY_26);

      expect(result.CategorySummaries).toHaveLength(2);
      const names = result.CategorySummaries.map((s) => s.CategoryName);
      expect(names).toContain("Food");
      expect(names).toContain("Transport");
    });

    it("should keep the Income category so its transactions can be persisted and broken down", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory.mockReturnValue("Income");
      const tx = makeTransaction({ Amount: 5000 });

      const result = await service.analyseTransactions(2, 2026, [tx], PAY_26);

      const income = result.CategorySummaries.find(s => s.CategoryName === "Income");
      expect(income?.TotalAmount).toBe(5000);
      expect(income?.Transactions).toHaveLength(1);
      expect(result.TotalIncome).toBe(5000);
    });

    it("should sum amounts within a category and keep its transactions", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx1 = makeTransaction({ Amount: -50, Description: "Shop A" });
      const tx2 = makeTransaction({ Amount: -30, Description: "Shop B" });

      const result = await service.analyseTransactions(2, 2026, [tx1, tx2], PAY_26);

      expect(result.CategorySummaries[0].TotalAmount).toBe(80);
      expect(result.CategorySummaries[0].Transactions).toHaveLength(2);
    });

    it("should populate Merchants when a merchant is resolved", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveMerchant.mockReturnValue("Woolworths");
      const tx = makeTransaction({ Amount: -50, Description: "WOOLWORTHS FOOD" });

      const result = await service.analyseTransactions(2, 2026, [tx], PAY_26);

      expect(result.CategorySummaries[0].Merchants).toContain("Woolworths");
    });

    it("should call resolveMerchant with the description and resolveCategory per transaction", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx1 = makeTransaction({ Description: "PICK N PAY" });
      const tx2 = makeTransaction({ Description: "Shop B" });

      await service.analyseTransactions(2, 2026, [tx1, tx2], PAY_26);

      expect(mockHandler.resolveMerchant).toHaveBeenCalledWith("PICK N PAY");
      expect(mockHandler.resolveCategory).toHaveBeenCalledTimes(2);
    });
  });

  describe("multi-month statement", () => {
    // Regression: a statement export covering several months used to have its month
    // inferred from whichever month had the most rows, so the fullest month won and the
    // month being viewed was never reported on.
    const mayJunJul = (): ITransaction[] => [
      ...Array.from({ length: 20 }, (_, i) =>
        makeTransaction({ Date: new Date(2026, 4, i + 1), Amount: -5, Description: `may-${i}` }),
      ),
      makeTransaction({ Date: new Date(2026, 5, 20), Amount: -10, Description: "jun" }),
      makeTransaction({ Date: new Date(2026, 6, 20), Amount: -100, Description: "jul" }),
    ];

    it("should report the requested month even when another month dominates the file", async () => {
      const service = new DataAnalysisService(mockHandler, false);

      const result = await service.analyseTransactions(7, 2026, mayJunJul(), PAY_26);

      expect(result.TotalExpenses).toBe(100);
    });

    it("should report an earlier month when that is the one being viewed", async () => {
      const service = new DataAnalysisService(mockHandler, false);

      const result = await service.analyseTransactions(6, 2026, mayJunJul(), PAY_26);

      expect(result.TotalExpenses).toBe(10);
    });

    it("should date the report by the requested month, not the time of processing", async () => {
      const service = new DataAnalysisService(mockHandler, false);

      const result = await service.analyseTransactions(7, 2026, mayJunJul(), PAY_26);

      expect(result.Date.toISOString()).toBe("2026-07-31T00:00:00.000Z");
    });
  });

  describe("date range (driven by the requested month)", () => {
    it("should exclude the day before pay day, which closes the previous cycle", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      // Keeps the report non-empty, so this measures exclusion and not the empty-period guard.
      const anchor = makeTransaction({ Date: new Date(2026, 1, 10), Amount: -10 });
      const dayBefore = makeTransaction({ Date: new Date(2026, 0, 25), Amount: -1000 });

      const result = await service.analyseTransactions(2, 2026, [anchor, dayBefore], PAY_26);

      expect(result.TotalExpenses).toBe(10);
    });

    it("should include the day after pay day, which opens the cycle", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const dayAfter = makeTransaction({ Date: new Date(2026, 0, 26), Amount: -1000 });

      const result = await service.analyseTransactions(2, 2026, [dayAfter], PAY_26);

      expect(result.TotalExpenses).toBe(1000);
    });
  });

  describe("date range (boundaries)", () => {
    // Range for a Feb 2026 report is [26 Jan 2026 .. 25 Feb 2026]. Two -10 anchors
    // total 20; a distinctive -1000 boundary transaction reveals inclusion/exclusion.
    const febAnchors = (): ITransaction[] => [
      makeTransaction({ Date: new Date(2026, 1, 10), Amount: -10, Description: "anchor1" }),
      makeTransaction({ Date: new Date(2026, 1, 11), Amount: -10, Description: "anchor2" }),
    ];

    it("should include a transaction inside the range", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2026, 1, 15), Amount: -1000 });

      const result = await service.analyseTransactions(2, 2026, [...febAnchors(), boundary], PAY_26);

      expect(result.TotalExpenses).toBe(1020);
    });

    it("should exclude a transaction before the start of the range", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2026, 0, 20), Amount: -1000 }); // 20 Jan

      const result = await service.analyseTransactions(2, 2026, [...febAnchors(), boundary], PAY_26);

      expect(result.TotalExpenses).toBe(20);
    });

    it("should exclude a transaction after the end of the range", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2026, 2, 1), Amount: -1000 }); // 1 Mar

      const result = await service.analyseTransactions(2, 2026, [...febAnchors(), boundary], PAY_26);

      expect(result.TotalExpenses).toBe(20);
    });
  });

  describe("date range (January report — December paid early)", () => {
    // Pay day 13 both sides gives [13 Dec 2025 .. 12 Jan 2026]. Two -10 Jan anchors total 20.
    const PAY_13 = { previousMonth: 13, targetMonth: 13 };
    const janAnchors = (): ITransaction[] => [
      makeTransaction({ Date: new Date(2026, 0, 10), Amount: -10, Description: "j1" }),
      makeTransaction({ Date: new Date(2026, 0, 11), Amount: -10, Description: "j2" }),
    ];

    it("should include December transactions from the declared pay day onwards", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2025, 11, 20), Amount: -1000 });

      const result = await service.analyseTransactions(1, 2026, [...janAnchors(), boundary], PAY_13);

      expect(result.TotalExpenses).toBe(1020);
    });

    it("should exclude December transactions before the declared pay day", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2025, 11, 10), Amount: -1000 });

      const result = await service.analyseTransactions(1, 2026, [...janAnchors(), boundary], PAY_13);

      expect(result.TotalExpenses).toBe(20);
    });

    it("should exclude transactions from the next cycle's pay day onwards", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2026, 0, 13), Amount: -1000 });

      const result = await service.analyseTransactions(1, 2026, [...janAnchors(), boundary], PAY_13);

      expect(result.TotalExpenses).toBe(20);
    });

    it("should not double-count: December's cycle ends where January's begins", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      // 20 Dec is in the range that used to land in both reports.
      const shared = makeTransaction({ Date: new Date(2025, 11, 20), Amount: -1000 });
      const decAnchor = makeTransaction({ Date: new Date(2025, 11, 1), Amount: -10 });

      const december = await service.analyseTransactions(
        12,
        2025,
        [decAnchor, shared],
        { previousMonth: 26, targetMonth: 13 },
      );
      const january = await service.analyseTransactions(
        1,
        2026,
        [...janAnchors(), shared],
        PAY_13,
      );

      expect(december.TotalExpenses).toBe(10);
      expect(january.TotalExpenses).toBe(1020);
    });
  });

  describe("pay date detection", () => {
    const salary = (date: Date, amount = 30000): ITransaction =>
      makeTransaction({ Date: date, Amount: amount, Description: "SALARY" });

    it("should anchor the cycle on a credit landing within two days of the declared day", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      // Declared the 26th, actually paid the 24th; 25 Jan then falls inside the cycle.
      const paid = salary(new Date(2026, 0, 24));
      const spend = makeTransaction({ Date: new Date(2026, 0, 25), Amount: -1000 });

      const result = await service.analyseTransactions(2, 2026, [paid, spend], PAY_26);

      expect(result.TotalExpenses).toBe(1000);
    });

    it("should ignore a credit outside the tolerance", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      // A large credit on the 20th is not pay, so the cycle still opens on the 26th.
      const windfall = salary(new Date(2026, 0, 20), 99999);
      const spend = makeTransaction({ Date: new Date(2026, 0, 25), Amount: -1000 });
      const anchor = makeTransaction({ Date: new Date(2026, 1, 10), Amount: -10 });

      const result = await service.analyseTransactions(2, 2026, [windfall, spend, anchor], PAY_26);

      expect(result.TotalExpenses).toBe(10);
    });

    it("should pick the largest credit when several land in the window", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const small = salary(new Date(2026, 0, 24), 500);
      const actualPay = salary(new Date(2026, 0, 27), 30000);
      const spend = makeTransaction({ Date: new Date(2026, 0, 26), Amount: -1000 });
      const anchor = makeTransaction({ Date: new Date(2026, 1, 10), Amount: -10 });

      const result = await service.analyseTransactions(
        2,
        2026,
        [small, actualPay, spend, anchor],
        PAY_26,
      );

      // Cycle opens on the 27th, so the 26th belongs to the previous month.
      expect(result.TotalExpenses).toBe(10);
    });

    it("should clamp a pay day beyond the end of a short month", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      // Pay day 31 in February 2026 clamps to the 28th, opening the March cycle there.
      const boundary = makeTransaction({ Date: new Date(2026, 1, 28), Amount: -1000 });

      const result = await service.analyseTransactions(3, 2026, [boundary], {
        previousMonth: 31,
        targetMonth: 31,
      });

      expect(result.TotalExpenses).toBe(1000);
    });

    it("should find a credit across a month boundary for a pay day near the 1st", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      // Declared the 1st of February, actually paid 30 January.
      const paid = salary(new Date(2026, 0, 30));
      const spend = makeTransaction({ Date: new Date(2026, 0, 31), Amount: -1000 });

      const result = await service.analyseTransactions(3, 2026, [paid, spend], {
        previousMonth: 1,
        targetMonth: 1,
      });

      expect(result.TotalExpenses).toBe(1000);
    });
  });

  describe("no transactions in the requested period", () => {
    it("should throw rather than produce a report that would overwrite the month", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const july = makeTransaction({ Date: new Date(2026, 6, 10), Amount: -100 });

      await expect(service.analyseTransactions(9, 2026, [july], PAY_26)).rejects.toThrow(
        NoTransactionsInPeriodError,
      );
    });

    it("should name both the requested window and the file's own range", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const june = makeTransaction({ Date: new Date(2026, 5, 10), Amount: -100 });

      // Short names stable across ICU versions, so this tests the message not the locale data.
      await expect(
        service.analyseTransactions(8, 2026, [june], PAY_26),
      ).rejects.toThrow(/26 Jul 2026.*25 Aug 2026.*10 Jun 2026/);
    });

    it("should not save anything when the period is empty", async () => {
      const service = new DataAnalysisService(mockHandler, true);
      const july = makeTransaction({ Date: new Date(2026, 6, 10), Amount: -100 });

      await expect(service.analyseTransactions(9, 2026, [july], PAY_26)).rejects.toThrow();
      expect(mockedSave).not.toHaveBeenCalled();
    });
  });

  describe("empty / no-op input", () => {
    it("should return a zeroed report for an empty transaction list (no throw)", async () => {
      const service = new DataAnalysisService(mockHandler, false);

      const result = await service.analyseTransactions(2, 2026, [], PAY_26);

      expect(result.TotalIncome).toBe(0);
      expect(result.TotalExpenses).toBe(0);
      expect(result.TotalSavings).toBe(0);
      expect(result.CategorySummaries).toHaveLength(0);
    });

    it("should not attempt to save an empty report even when autoSave is on", async () => {
      const service = new DataAnalysisService(mockHandler, true);

      await service.analyseTransactions(2, 2026, [], PAY_26);

      expect(mockedSave).not.toHaveBeenCalled();
    });
  });

  describe("autoSave behaviour", () => {
    it("should call apiClient.saveReportAnalysis when autoSave is true", async () => {
      const service = new DataAnalysisService(mockHandler, true);

      await service.analyseTransactions(2, 2026, [makeTransaction()], PAY_26);

      expect(mockedSave).toHaveBeenCalledTimes(1);
      expect(mockedSave).toHaveBeenCalledWith(
        expect.objectContaining({ TotalExpenses: 50 }),
      );
    });

    it("should not call saveReportAnalysis when autoSave is false", async () => {
      const service = new DataAnalysisService(mockHandler, false);

      await service.analyseTransactions(2, 2026, [makeTransaction()], PAY_26);

      expect(mockedSave).not.toHaveBeenCalled();
    });

    it("should default autoSave to true", async () => {
      const service = new DataAnalysisService(mockHandler); // no autoSave arg

      await service.analyseTransactions(2, 2026, [makeTransaction()], PAY_26);

      expect(mockedSave).toHaveBeenCalledTimes(1);
    });
  });
});
