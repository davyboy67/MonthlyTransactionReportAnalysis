import { DataAnalysisService } from "../src/services/dataAnalysisService";
import { ITransactionInfoHandler } from "../src/utils/ITransactionInfoHandler";
import { ITransaction, TransactionType } from "../src/models/ITransaction";
import { apiClient } from "../src/services/apiClient";

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

  // Dates are built with the local-time constructor (new Date(y, mIndex, d)) so they
  // line up with the service, which derives its date range with the same local
  // constructor. The target month is inferred from the transactions themselves
  // (dominantMonth), so no system-clock mocking is needed.
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

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalIncome).toBe(5000);
      expect(result.TotalExpenses).toBe(0);
    });

    it("should assign Expense type and use the absolute amount for negatives", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Amount: -120.5 });

      const result = await service.analyseTransactions([tx]);

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

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalSavings).toBe(200);
      expect(result.TotalExpenses).toBe(0);
    });

    it("should treat a zero amount as Income (Amount >= 0)", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory.mockReturnValue("Income");
      const tx = makeTransaction({ Amount: 0 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalIncome).toBe(0);
      expect(result.TotalExpenses).toBe(0);
    });
  });

  describe("numeric accuracy", () => {
    it("should round each total to 2 decimal places", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Amount: -33.333 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalExpenses).toBe(33.33);
    });

    it("should sum many small amounts without floating point drift", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      // 0.1 + 0.2 famously != 0.3 in IEEE754; rounding to cents must fix it.
      const txs = [
        makeTransaction({ Amount: -0.1, Description: "a" }),
        makeTransaction({ Amount: -0.2, Description: "b" }),
      ];

      const result = await service.analyseTransactions(txs);

      expect(result.TotalExpenses).toBe(0.3);
    });

    it("should round a sub-cent amount to two decimal places", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Amount: -10.005 });

      const result = await service.analyseTransactions([tx]);

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

      const result = await service.analyseTransactions([tx1, tx2]);

      expect(result.CategorySummaries).toHaveLength(2);
      const names = result.CategorySummaries.map((s) => s.CategoryName);
      expect(names).toContain("Food");
      expect(names).toContain("Transport");
    });

    it("should exclude the Income category from CategorySummaries", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory.mockReturnValue("Income");
      const tx = makeTransaction({ Amount: 5000 });

      const result = await service.analyseTransactions([tx]);

      expect(result.CategorySummaries).toHaveLength(0);
      expect(result.TotalIncome).toBe(5000);
    });

    it("should sum amounts within a category and keep its transactions", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx1 = makeTransaction({ Amount: -50, Description: "Shop A" });
      const tx2 = makeTransaction({ Amount: -30, Description: "Shop B" });

      const result = await service.analyseTransactions([tx1, tx2]);

      expect(result.CategorySummaries[0].TotalAmount).toBe(80);
      expect(result.CategorySummaries[0].Transactions).toHaveLength(2);
    });

    it("should populate Merchants when a merchant is resolved", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveMerchant.mockReturnValue("Woolworths");
      const tx = makeTransaction({ Amount: -50, Description: "WOOLWORTHS FOOD" });

      const result = await service.analyseTransactions([tx]);

      expect(result.CategorySummaries[0].Merchants).toContain("Woolworths");
    });

    it("should call resolveMerchant with the description and resolveCategory per transaction", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx1 = makeTransaction({ Description: "PICK N PAY" });
      const tx2 = makeTransaction({ Description: "Shop B" });

      await service.analyseTransactions([tx1, tx2]);

      expect(mockHandler.resolveMerchant).toHaveBeenCalledWith("PICK N PAY");
      expect(mockHandler.resolveCategory).toHaveBeenCalledTimes(2);
    });
  });

  describe("date range (derived from the dominant month)", () => {
    // A cluster of February transactions makes Feb 2026 the dominant month.
    // Range for Feb is [25 Jan 2026 .. 25 Feb 2026]. Two -10 anchors total 20;
    // a distinctive -1000 boundary transaction reveals inclusion/exclusion.
    const febAnchors = (): ITransaction[] => [
      makeTransaction({ Date: new Date(2026, 1, 10), Amount: -10, Description: "anchor1" }),
      makeTransaction({ Date: new Date(2026, 1, 11), Amount: -10, Description: "anchor2" }),
    ];

    it("should include a transaction inside the range", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2026, 1, 15), Amount: -1000 });

      const result = await service.analyseTransactions([...febAnchors(), boundary]);

      expect(result.TotalExpenses).toBe(1020);
    });

    it("should exclude a transaction before the start of the range", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2026, 0, 20), Amount: -1000 }); // 20 Jan

      const result = await service.analyseTransactions([...febAnchors(), boundary]);

      expect(result.TotalExpenses).toBe(20);
    });

    it("should exclude a transaction after the end of the range", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2026, 2, 1), Amount: -1000 }); // 1 Mar

      const result = await service.analyseTransactions([...febAnchors(), boundary]);

      expect(result.TotalExpenses).toBe(20);
    });
  });

  describe("date range (January report — December pay-day widening)", () => {
    // A cluster of January transactions makes Jan 2026 dominant. Because people are
    // paid early in December, the range start is widened to 13 Dec 2025, giving
    // [13 Dec 2025 .. 25 Jan 2026]. Two -10 Jan anchors total 20.
    const janAnchors = (): ITransaction[] => [
      makeTransaction({ Date: new Date(2026, 0, 10), Amount: -10, Description: "j1" }),
      makeTransaction({ Date: new Date(2026, 0, 11), Amount: -10, Description: "j2" }),
    ];

    it("should include December transactions from the 13th onwards", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2025, 11, 20), Amount: -1000 });

      const result = await service.analyseTransactions([...janAnchors(), boundary]);

      expect(result.TotalExpenses).toBe(1020);
    });

    it("should exclude December transactions before the 13th", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2025, 11, 10), Amount: -1000 });

      const result = await service.analyseTransactions([...janAnchors(), boundary]);

      expect(result.TotalExpenses).toBe(20);
    });

    it("should include transactions up to 25 Jan", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2026, 0, 20), Amount: -1000 });

      const result = await service.analyseTransactions([...janAnchors(), boundary]);

      expect(result.TotalExpenses).toBe(1020);
    });

    it("should exclude transactions after 25 Jan", async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const boundary = makeTransaction({ Date: new Date(2026, 0, 30), Amount: -1000 });

      const result = await service.analyseTransactions([...janAnchors(), boundary]);

      expect(result.TotalExpenses).toBe(20);
    });
  });

  describe("empty / no-op input", () => {
    it("should return a zeroed report for an empty transaction list (no throw)", async () => {
      const service = new DataAnalysisService(mockHandler, false);

      const result = await service.analyseTransactions([]);

      expect(result.TotalIncome).toBe(0);
      expect(result.TotalExpenses).toBe(0);
      expect(result.TotalSavings).toBe(0);
      expect(result.CategorySummaries).toHaveLength(0);
    });

    it("should not attempt to save an empty report even when autoSave is on", async () => {
      const service = new DataAnalysisService(mockHandler, true);

      await service.analyseTransactions([]);

      expect(mockedSave).not.toHaveBeenCalled();
    });
  });

  describe("autoSave behaviour", () => {
    it("should call apiClient.saveReportAnalysis when autoSave is true", async () => {
      const service = new DataAnalysisService(mockHandler, true);

      await service.analyseTransactions([makeTransaction()]);

      expect(mockedSave).toHaveBeenCalledTimes(1);
      expect(mockedSave).toHaveBeenCalledWith(
        expect.objectContaining({ TotalExpenses: 50 }),
      );
    });

    it("should not call saveReportAnalysis when autoSave is false", async () => {
      const service = new DataAnalysisService(mockHandler, false);

      await service.analyseTransactions([makeTransaction()]);

      expect(mockedSave).not.toHaveBeenCalled();
    });

    it("should default autoSave to true", async () => {
      const service = new DataAnalysisService(mockHandler); // no autoSave arg

      await service.analyseTransactions([makeTransaction()]);

      expect(mockedSave).toHaveBeenCalledTimes(1);
    });
  });
});
